import {
  festivalCulturalGuideSchema,
  festivalDetailSchema,
  festivalDetailWithCultureSchema,
  festivalOccurrenceSchema,
  festivalSourceSchema,
} from '@saraya/contracts';

import culturalGuideSeeds from '../../../../../../database/seeds/festival-cultural-guides.json';
import festivalSeeds from '../../../../../../database/seeds/festivals.json';
import { mockCulturalGuides, mockFestivals } from '../data/mockFestivals';
import { MockFestivalGateway } from '../gateways';
import {
  canCreateExactFestivalCalendarEvent,
  getFestivalSchedulePresentation,
} from '../services/festival-schedule';

describe('festival fixtures and gateway', () => {
  it('provides the expanded, contract-valid canonical catalog across the year', () => {
    expect(mockFestivals).toHaveLength(151);
    expect(() => festivalDetailSchema.array().parse(mockFestivals)).not.toThrow();
    expect(() => festivalDetailSchema.array().parse(festivalSeeds)).not.toThrow();
    expect(() => festivalCulturalGuideSchema.array().parse(culturalGuideSeeds)).not.toThrow();
    expect(() => festivalDetailWithCultureSchema.array().parse(mockFestivals)).not.toThrow();
    expect(
      new Set(mockFestivals.map((festival) => festival.typicalMonth)).size,
    ).toBeGreaterThanOrEqual(10);
    expect(new Set(mockFestivals.map((festival) => festival.region)).size).toBeGreaterThanOrEqual(
      7,
    );
  });

  it('keeps exactly one cultural guide for every canonical festival', () => {
    const festivalIds = festivalSeeds.map((festival) => festival.id);
    const culturalFestivalIds = culturalGuideSeeds.map((guide) => guide.festivalId);

    expect(festivalIds).toHaveLength(151);
    expect(culturalFestivalIds).toHaveLength(151);
    expect(new Set(festivalIds).size).toBe(151);
    expect(new Set(culturalFestivalIds).size).toBe(151);
    expect([...festivalIds].sort()).toEqual([...culturalFestivalIds].sort());
  });

  it('rejects invalid cultural verification, URLs, and provenance references', () => {
    const atiAtihan = mockCulturalGuides.find((guide) => guide.festivalId === 'ati-atihan')!;

    expect(() =>
      festivalCulturalGuideSchema.parse({
        ...atiAtihan,
        categories: {
          ...atiAtihan.categories,
          history: { ...atiAtihan.categories.history, verificationStatus: 'probably-verified' },
        },
      }),
    ).toThrow();
    expect(() =>
      festivalCulturalGuideSchema.parse({
        ...atiAtihan,
        sources: [{ ...atiAtihan.sources[0], url: 'https://www.google.com/search?q=ati-atihan' }],
      }),
    ).toThrow();
    expect(() =>
      festivalCulturalGuideSchema.parse({
        ...atiAtihan,
        categories: {
          ...atiAtihan.categories,
          history: { ...atiAtihan.categories.history, sourceIds: ['missing-source'] },
        },
      }),
    ).toThrow();
    expect(() =>
      festivalCulturalGuideSchema.parse({
        ...atiAtihan,
        sources: [{ ...atiAtihan.sources[0], supports: ['customs'] }],
      }),
    ).toThrow();
  });

  it('contains no opaque citations, search URLs, or unsupported exact tipping claims', () => {
    const serialized = JSON.stringify(culturalGuideSeeds);
    expect(serialized).not.toMatch(/\[cite:\s*\d+\]/i);
    expect(serialized).not.toMatch(/https?:\/\/(?:www\.)?(?:google\.|bing\.com)/i);
    expect(serialized).not.toMatch(/\b\d{1,2}\s*%\s+(?:tip|tipping)/i);

    for (const guide of mockCulturalGuides) {
      for (const category of Object.values(guide.categories)) {
        if (category.verificationStatus === 'general-guidance') {
          expect(category.sourceIds).toEqual([]);
        }
      }
    }
  });

  it('uses visitor-facing, festival-specific copy when evidence is still missing', () => {
    const festival = mockFestivals.find((item) => item.id === 'diyandi-balingasag')!;
    const guide = festival.culturalGuide;

    expect(guide.categories.history.text).toContain(festival.name);
    expect(guide.categories.history.text).toMatch(/not yet found a reliable source/i);
    expect(guide.categories.customs.text).toContain(festival.name);
    expect(guide.categories.customs.text).toMatch(/follow posted organizer guidance/i);
    expect(guide.categories.pasalubong.text).toContain(festival.name);
    expect(guide.categories.pasalubong.text).toMatch(/local tourism office/i);
  });

  it('adds source-backed visitor guidance for the newly researched festivals', () => {
    const researchedIds = [
      'masskara',
      'higantes',
      'kaamulan',
      'lanzones',
      'kadaugan-sa-mactan',
      'sandugo',
      'zamboanga-hermosa',
      'paraw-regatta',
      'international-bamboo-organ',
      'pulilan-carabao',
      'pista-y-dayat',
      'ibalong',
      'parada-ng-lechon',
      'magayon',
      'naliyagan',
      'tinagba',
    ];

    for (const id of researchedIds) {
      const guide = mockCulturalGuides.find((item) => item.festivalId === id)!;
      expect(guide.categories.history.verificationStatus).toBe('verified');
      expect(guide.categories.history.sourceIds.length).toBeGreaterThan(0);
      expect(guide.categories.customs.verificationStatus).toBe('verified');
      expect(guide.categories.customs.sourceIds.length).toBeGreaterThan(0);
      expect(guide.sources.length).toBeGreaterThan(0);
    }
  });

  it('keeps IDs and normalized name/locality pairs unique', () => {
    const ids = mockFestivals.map((festival) => festival.id);
    const normalizedIdentity = mockFestivals.map((festival) =>
      `${festival.name}|${festival.city}`
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase()
        .replace(/[^a-z0-9]+/g, ''),
    );

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(normalizedIdentity).size).toBe(normalizedIdentity.length);
  });

  it('contains every requested headline festival', () => {
    const ids = mockFestivals.map((festival) => festival.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'sinulog',
        'ati-atihan',
        'dinagyang',
        'panagbenga',
        'pahiyas',
        'kadayawan',
        'masskara',
        'higantes',
        'moriones',
        'pintados-kasadyaan',
      ]),
    );
  });

  it('searches tradition and place fields, then filters by region and month', async () => {
    const gateway = new MockFestivalGateway(mockFestivals, 9, 0);

    await expect(gateway.list({ search: 'lantern' })).resolves.toEqual([
      expect.objectContaining({ id: 'giant-lantern' }),
    ]);
    await expect(gateway.list({ search: 'Kuyamis' })).resolves.toEqual([
      expect.objectContaining({ id: 'kuyamis' }),
    ]);

    const davao = await gateway.list({ region: 'Davao Region' });
    expect(davao).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'kadayawan' })]));
    expect(davao.length).toBeGreaterThan(1);

    const january = await gateway.list({ month: 1 });
    expect(january).toHaveLength(7);
    expect(january.map((festival) => festival.id)).toEqual(
      expect.arrayContaining(['ati-atihan', 'dinagyang', 'kuyamis', 'sinulog']),
    );
  });

  it('orders the unfiltered list by the next recurring month', async () => {
    const gateway = new MockFestivalGateway(mockFestivals, 9, 0);
    const festivals = await gateway.list({});

    const repeated = await gateway.list({});
    expect(repeated.map((festival) => festival.id)).toEqual(
      festivals.map((festival) => festival.id),
    );
    expect(festivals[0]?.typicalMonth).toBe(9);
    expect(festivals.at(-1)?.typicalMonth).toBe(8);
  });

  it('returns complete details and null for unknown ids', async () => {
    const gateway = new MockFestivalGateway(mockFestivals, 1, 0);

    await expect(gateway.getById('kadayawan')).resolves.toEqual(
      expect.objectContaining({
        name: 'Kadayawan Festival',
        sarayaEditorial: expect.objectContaining({
          attribution: 'Saraya-curated',
          travelAdvice: expect.any(Array),
          survivalGuide: expect.any(Array),
        }),
        culturalGuide: expect.objectContaining({ festivalId: 'kadayawan' }),
      }),
    );
    await expect(gateway.getById('not-a-festival')).resolves.toBeNull();
    await expect(gateway.getById('kuyamis')).resolves.toEqual(
      expect.objectContaining({ name: 'Kuyamis Festival' }),
    );
  });

  it('records provenance, supports multiple sources, and validates direct URLs', () => {
    const kadayawan = mockFestivals.find((festival) => festival.id === 'kadayawan');
    expect(kadayawan?.sources.length).toBeGreaterThanOrEqual(2);
    expect(kadayawan?.sources.map((source) => source.purpose)).toEqual(
      expect.arrayContaining(['general', 'cultural', 'schedule']),
    );

    const invalidSource = (url: string) =>
      festivalSourceSchema.parse({
        id: 'bad-source',
        publisher: 'Search result',
        title: 'Redirect',
        url,
        sourceType: 'secondary',
        purpose: 'general',
        accessedAt: '2026-09-19',
      });

    expect(() => invalidSource('https://www.google.com/search?q=festival')).toThrow();
    expect(() => invalidSource('https://www.bing.com/search?q=festival')).toThrow();
  });

  it('keeps every provenance reference direct, resolvable, and offline', () => {
    for (const festival of mockFestivals) {
      const sourceIds = new Set(festival.sources.map((source) => source.id));
      expect(festival.sources.length).toBeGreaterThan(0);
      expect(festival.occurrence.sourceIds.every((sourceId) => sourceIds.has(sourceId))).toBe(true);

      for (const source of festival.sources) {
        expect(source.url).toMatch(/^https?:\/\//);
        expect(source.url).not.toMatch(/^https?:\/\/(?:www\.)?(?:google\.|bing\.com)/i);
      }

      if (festival.occurrence.scheduleStatus !== 'confirmed') {
        expect(festival.occurrence.confirmedStartDate).toBeUndefined();
        expect(festival.occurrence.confirmedEndDate).toBeUndefined();
      }
    }
  });

  it('validates lastVerifiedAt and forbids confirmed dates on recurring records', () => {
    const recurring = mockFestivals.find((festival) => festival.id === 'moriones')!;
    expect(recurring.occurrence.scheduleStatus).toBe('recurring');
    expect(recurring.occurrence.confirmedStartDate).toBeUndefined();
    expect(getFestivalSchedulePresentation(recurring).title).toContain('Typically');

    expect(() =>
      festivalOccurrenceSchema.parse({
        ...recurring.occurrence,
        lastVerifiedAt: 'not-a-timestamp',
      }),
    ).toThrow();
    expect(() =>
      festivalOccurrenceSchema.parse({
        ...recurring.occurrence,
        confirmedStartDate: '2026-04-01',
        confirmedEndDate: '2026-04-05',
      }),
    ).toThrow();
  });

  it('shows exact dates only for confirmed occurrences', () => {
    const masskara = mockFestivals.find((festival) => festival.id === 'masskara')!;
    const presentation = getFestivalSchedulePresentation(masskara);

    expect(masskara.occurrence.scheduleStatus).toBe('confirmed');
    expect(presentation.title).toBe('2026 schedule confirmed');
    expect(presentation.shortLabel).toContain('October 1–18, 2026');
    expect(canCreateExactFestivalCalendarEvent(masskara.occurrence)).toBe(true);
  });

  it('visibly differentiates estimated and cancelled occurrences', () => {
    const sandugo = mockFestivals.find((festival) => festival.id === 'sandugo')!;
    expect(sandugo.occurrence.scheduleStatus).toBe('estimated');
    expect(getFestivalSchedulePresentation(sandugo).title).toBe(
      'Expected period — verify before travel',
    );
    expect(canCreateExactFestivalCalendarEvent(sandugo.occurrence)).toBe(false);

    const cancelled = festivalOccurrenceSchema.parse({
      scheduleYear: 2027,
      scheduleStatus: 'cancelled',
      verificationNote: 'An authoritative organizer notice confirms cancellation.',
      lastVerifiedAt: '2027-01-02T09:00:00+08:00',
      sourceIds: ['organizer-cancellation'],
      events: [],
    });
    expect(
      getFestivalSchedulePresentation({
        recurrenceDescription: 'every January',
        occurrence: cancelled,
      }).title,
    ).toBe('2027 occurrence cancelled');
    expect(canCreateExactFestivalCalendarEvent(cancelled)).toBe(false);
  });
});
