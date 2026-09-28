import type {
  CulturalGuideCategory,
  CulturalGuideSection,
  CulturalGuideVerificationStatus,
} from '@saraya/contracts';

const culturalStatusLabels: Record<CulturalGuideVerificationStatus, string> = {
  verified: 'Verified',
  'partially-verified': 'Partially verified',
  'general-guidance': 'Traveler guidance',
  'insufficient-evidence': 'Not verified yet',
};

const unavailableCopy: Partial<Record<CulturalGuideCategory, string>> = {
  history: "Oops! Saraya couldn't find reliable history about this festival yet.",
  customs:
    "Saraya couldn't verify festival-specific customs yet. Check organizer guidance and be respectful during religious and community activities.",
  pasalubong:
    "Saraya doesn't have a verified pasalubong recommendation for this festival yet. Look for products recommended by local tourism offices or established community sellers.",
};

const genericUnavailableCopy =
  "Oops! Saraya couldn't find reliable information for this section yet.";

export function getCulturalStatusLabel(status: CulturalGuideVerificationStatus): string {
  return culturalStatusLabels[status];
}

export function getCulturalGuideText(
  category: CulturalGuideCategory,
  section: CulturalGuideSection,
): string {
  if (section.verificationStatus !== 'insufficient-evidence') {
    return section.text;
  }

  return unavailableCopy[category] ?? genericUnavailableCopy;
}
