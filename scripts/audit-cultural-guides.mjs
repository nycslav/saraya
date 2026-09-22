import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const festivals = JSON.parse(
  fs.readFileSync(path.join(root, 'database', 'seeds', 'festivals.json'), 'utf8'),
);
const guides = JSON.parse(
  fs.readFileSync(path.join(root, 'database', 'seeds', 'festival-cultural-guides.json'), 'utf8'),
);
const duplicateValues = (values) => [
  ...new Set(values.filter((value, index) => values.indexOf(value) !== index)),
];
const festivalIds = festivals.map((festival) => festival.id);
const guideIds = guides.map((guide) => guide.festivalId);
const festivalSet = new Set(festivalIds);
const guideSet = new Set(guideIds);
const sources = new Map(guides.flatMap((guide) => guide.sources).map((item) => [item.url, item]));
const categories = guides.flatMap((guide) => Object.values(guide.categories));
const serialized = JSON.stringify(guides);
const sourceTypeCounts = {
  dot: 0,
  tpb: 0,
  ncca: 0,
  nhcp: 0,
  lgu: 0,
  'official-organizer': 0,
  'official-cultural-institution': 0,
  academic: 0,
  secondary: 0,
  'official-government': 0,
  'regional-tourism': 0,
};
for (const item of sources.values()) {
  sourceTypeCounts[item.sourceType] = (sourceTypeCounts[item.sourceType] ?? 0) + 1;
}

const audit = {
  festivalCount: festivals.length,
  culturalGuideCount: guides.length,
  festivalUniqueIds: festivalSet.size,
  culturalGuideUniqueIds: guideSet.size,
  festivalDuplicates: duplicateValues(festivalIds),
  culturalGuideDuplicates: duplicateValues(guideIds),
  festivalsMissingCulture: festivalIds.filter((id) => !guideSet.has(id)),
  orphanCulturalGuides: guideIds.filter((id) => !festivalSet.has(id)),
  idSetsMatch: festivalSet.size === guideSet.size && festivalIds.every((id) => guideSet.has(id)),
  categoriesReviewed: categories.length,
  verificationStatuses: categories.reduce((counts, category) => {
    counts[category.verificationStatus] = (counts[category.verificationStatus] ?? 0) + 1;
    return counts;
  }, {}),
  uniqueSources: sources.size,
  sourceTypes: sourceTypeCounts,
  citationMarkers: (serialized.match(/\[cite:\s*\d+\]/gi) ?? []).length,
  searchEngineUrls: [...sources.keys()].filter((url) =>
    /^https?:\/\/(?:www\.)?(?:google\.[^/]+|bing\.com)(?:\/|$)/i.test(url),
  ),
  exactTippingPercentages: (serialized.match(/\b\d{1,2}\s*%\s+(?:tip|tipping)/gi) ?? []).length,
  records: guides.map((guide) => ({
    festivalId: guide.festivalId,
    categoriesReviewed: Object.keys(guide.categories),
    categoriesVerified: Object.entries(guide.categories)
      .filter(([, category]) => category.verificationStatus === 'verified')
      .map(([name]) => name),
    categoriesPartiallyVerified: Object.entries(guide.categories)
      .filter(([, category]) => category.verificationStatus === 'partially-verified')
      .map(([name]) => name),
    categoriesGeneralGuidance: Object.entries(guide.categories)
      .filter(([, category]) => category.verificationStatus === 'general-guidance')
      .map(([name]) => name),
    categoriesInsufficientEvidence: Object.entries(guide.categories)
      .filter(([, category]) => category.verificationStatus === 'insufficient-evidence')
      .map(([name]) => name),
    sourceCount: guide.sources.length,
    lastReviewedAt: guide.lastReviewedAt,
  })),
};

const output = process.argv.includes('--summary') ? { ...audit, records: undefined } : audit;
console.log(JSON.stringify(output, null, 2));

if (
  festivals.length !== 151 ||
  guides.length !== 151 ||
  !audit.idSetsMatch ||
  audit.festivalDuplicates.length > 0 ||
  audit.culturalGuideDuplicates.length > 0 ||
  audit.citationMarkers > 0 ||
  audit.searchEngineUrls.length > 0
) {
  process.exitCode = 1;
}
