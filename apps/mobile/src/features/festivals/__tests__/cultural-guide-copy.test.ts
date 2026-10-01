import type { CulturalGuideSection } from '@saraya/contracts';

import { getCulturalGuideText, getCulturalStatusLabel } from '../services/cultural-guide-copy';

const insufficientSection: CulturalGuideSection = {
  text: 'Internal evidence-preserving fallback text.',
  verificationStatus: 'insufficient-evidence',
  sourceIds: [],
};

describe('festival cultural-guide presentation copy', () => {
  it('uses friendly category-specific copy when evidence is insufficient', () => {
    expect(getCulturalGuideText('history', insufficientSection)).toBe(
      "Oops! Saraya couldn't find reliable history about this festival yet.",
    );
    expect(getCulturalGuideText('pasalubong', insufficientSection)).toContain(
      "Saraya doesn't have a verified pasalubong recommendation",
    );
    expect(getCulturalStatusLabel('insufficient-evidence')).toBe('Not verified yet');
  });

  it('keeps verified, partially verified, and traveler guidance text unchanged', () => {
    for (const verificationStatus of [
      'verified',
      'partially-verified',
      'general-guidance',
    ] as const) {
      const section: CulturalGuideSection = {
        text: `${verificationStatus} original copy`,
        verificationStatus,
        sourceIds: verificationStatus === 'general-guidance' ? [] : ['source-1'],
      };

      expect(getCulturalGuideText('history', section)).toBe(section.text);
    }
  });

  it('uses a safe generic fallback for any other cultural-guide category', () => {
    expect(getCulturalGuideText('payment', insufficientSection)).toBe(
      "Oops! Saraya couldn't find reliable information for this section yet.",
    );
  });
});
