import { PostgresFestivalRepository } from '../../src/modules/festivals/festival.postgres-repository';
import {
  seedFestivalCulturalGuides,
  seedFestivalDetails,
} from '../../src/modules/festivals/festival.seed';

const mockQuery = jest.fn();

jest.mock('../../src/platform/database/pool', () => ({
  getPool: () => ({ query: mockQuery }),
}));

describe('PostgresFestivalRepository', () => {
  const festival = seedFestivalDetails.find(({ id }) => id === 'kadayawan')!;
  const guide = seedFestivalCulturalGuides.find(({ festivalId }) => festivalId === festival.id)!;

  beforeEach(() => mockQuery.mockReset());

  it('retrieves filtered festival summaries with parameterized SQL', async () => {
    mockQuery.mockResolvedValue({ rows: [{ festival_data: festival }] });
    const result = await new PostgresFestivalRepository().findAll({
      search: 'dance',
      region: 'Davao Region',
      month: 8,
    });

    expect(result).toEqual([expect.objectContaining({ id: 'kadayawan' })]);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('ILIKE'), [
      'dance',
      'Davao Region',
      8,
    ]);
  });

  it('uses cyclic month ordering for upcoming festivals', async () => {
    mockQuery.mockResolvedValue({ rows: [{ festival_data: JSON.stringify(festival) }] });
    await new PostgresFestivalRepository().findUpcoming({}, 9);

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('MOD(typical_month - $4'), [
      '',
      null,
      null,
      9,
    ]);
  });

  it('normalizes joined detail and cultural-guide rows', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ festival_data: festival, guide_data: JSON.stringify(guide) }],
    });
    await expect(new PostgresFestivalRepository().findById('kadayawan')).resolves.toEqual(
      expect.objectContaining({
        id: 'kadayawan',
        culturalGuide: expect.objectContaining({ festivalId: 'kadayawan' }),
      }),
    );
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE f.id = $1'), [
      'kadayawan',
    ]);
  });

  it('returns null for an unknown festival', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await expect(new PostgresFestivalRepository().findById('missing')).resolves.toBeNull();
  });
});
