import { PostgresSafetyAlertRepository } from '../../src/modules/safety-alerts/safety-alert.postgres-repository';

const mockQuery = jest.fn();

jest.mock('../../src/platform/database/pool', () => ({
  getPool: () => ({ query: mockQuery }),
}));

const row = {
  id: 'demo-row',
  alert_type: 'weather',
  severity: 'yellow',
  title: '[DEMO] SQL alert',
  summary: 'Synthetic row.',
  details: 'Synthetic row for repository mapping.',
  advice: ['Verify official guidance.'],
  alternatives: [],
  affected_regions: ['National Capital Region'],
  affected_area_description: 'Demo area',
  affected_area: JSON.stringify({
    type: 'MultiPolygon',
    coordinates: [[[[120.9, 14.5], [121.1, 14.5], [121.1, 14.7], [120.9, 14.7], [120.9, 14.5]]]],
  }),
  starts_at: '2026-01-01T00:00:00.000Z',
  ends_at: '2030-01-01T00:00:00.000Z',
  source_provider: 'saraya-demo',
  source_name: 'Synthetic test source',
  source_url: null,
  is_demo: true,
  created_at: '2026-09-22T00:00:00.000Z',
  updated_at: '2026-09-22T00:00:00.000Z',
};

describe('PostgresSafetyAlertRepository', () => {
  beforeEach(() => mockQuery.mockReset());

  it('uses active-time, filters, and PostGIS area matching', async () => {
    mockQuery.mockResolvedValue({ rows: [row] });
    const repository = new PostgresSafetyAlertRepository();
    const result = await repository.findActive(
      {
        kind: 'coordinates',
        label: 'your current location',
        region: 'National Capital Region',
        coordinates: { latitude: 14.6, longitude: 121 },
      },
      { severity: 'yellow', alertType: 'weather' },
      new Date('2026-09-22T12:00:00.000Z'),
    );

    expect(result[0]).toEqual(expect.objectContaining({ id: 'demo-row', source: expect.objectContaining({ isDemo: true }) }));
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('ST_Covers'), [
      '2026-09-22T12:00:00.000Z', 'yellow', 'weather', 14.6, 121, 'National Capital Region',
    ]);
    expect(mockQuery.mock.calls[0]?.[0]).toEqual(expect.stringContaining('ends_at > $1'));
  });

  it('resolves destination coordinates through the existing destinations table', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 'cebu-city', name: 'Cebu City', region: 'Central Visayas', latitude: '10.3157', longitude: '123.8854' }] });
    const repository = new PostgresSafetyAlertRepository();

    await expect(repository.resolveDestination('cebu-city')).resolves.toEqual(
      expect.objectContaining({ destinationId: 'cebu-city', coordinates: { latitude: 10.3157, longitude: 123.8854 } }),
    );
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM destinations WHERE id = $1'), ['cebu-city']);
  });

  it('retrieves an alert by id', async () => {
    mockQuery.mockResolvedValue({ rows: [row] });
    await expect(new PostgresSafetyAlertRepository().findById('demo-row')).resolves.toEqual(
      expect.objectContaining({ id: 'demo-row' }),
    );
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), ['demo-row']);
  });
});
