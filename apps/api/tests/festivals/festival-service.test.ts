import { InMemoryFestivalRepository } from '../../src/modules/festivals/festival.repository';
import { FestivalService } from '../../src/modules/festivals/festival.service';

describe('festival repository and service', () => {
  const repository = new InMemoryFestivalRepository();
  const service = new FestivalService(repository, () => new Date('2026-09-25T00:00:00.000Z'));

  it('lists festivals alphabetically and supports search, region, and month filters', async () => {
    const all = await service.list({});
    const searched = await service.list({ search: 'lantern' });
    const filtered = await service.list({ region: 'Davao Region', month: '8' });

    expect(all).toHaveLength(151);
    expect(all[0]!.name.localeCompare(all[1]!.name)).toBeLessThanOrEqual(0);
    expect(searched).toEqual([expect.objectContaining({ id: 'giant-lantern' })]);
    expect(filtered).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'kadayawan' })]));
    expect(filtered.every(({ region, typicalMonth }) => region === 'Davao Region' && typicalMonth === 8)).toBe(true);
  });

  it('orders upcoming recurring periods from the current month', async () => {
    const upcoming = await service.upcoming({});
    expect(upcoming[0]?.typicalMonth).toBe(9);
    expect(upcoming.at(-1)?.typicalMonth).toBe(8);
  });

  it('returns complete detail and null for an unknown valid ID', async () => {
    await expect(service.getById('kadayawan')).resolves.toEqual(
      expect.objectContaining({
        id: 'kadayawan',
        culturalGuide: expect.objectContaining({ festivalId: 'kadayawan' }),
      }),
    );
    await expect(service.getById('not-a-festival')).resolves.toBeNull();
  });

  it('rejects malformed IDs before repository access', () => {
    expect(() => service.getById('../not-valid')).toThrow();
  });
});
