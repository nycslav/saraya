import { MockDestinationGateway } from '../gateways';
import { mockDestinations } from '../data/mockDestinations';

describe('nationwide discovery', () => {
  const gateway = new MockDestinationGateway();

  it('contains six destinations from every Philippine island group', () => {
    expect(mockDestinations).toHaveLength(18);
    for (const islandGroup of ['Luzon', 'Visayas', 'Mindanao']) {
      expect(mockDestinations.filter((item) => item.islandGroup === islandGroup)).toHaveLength(6);
    }
  });

  it('searches names, regions, categories, and tags', async () => {
    const waterfalls = await gateway.list({ search: 'waterfalls' });
    expect(waterfalls.map((item) => item.id)).toEqual(expect.arrayContaining(['south-cebu', 'siquijor', 'lake-sebu']));

    const food = await gateway.list({ search: 'food', islandGroup: 'Mindanao' });
    expect(food.every((item) => item.islandGroup === 'Mindanao')).toBe(true);
    expect(food.length).toBeGreaterThan(0);
  });

  it('returns a full detail record by id', async () => {
    const detail = await gateway.getById('batanes');
    expect(detail?.name).toBe('Batanes');
    expect(detail?.thumbnailImageUrl).toContain('/destination-images/batanes.webp');
    expect(detail?.culturalGuide.etiquette).toHaveLength(3);
  });
});
