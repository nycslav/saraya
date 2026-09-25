import { mockFestivals } from '../data/mockFestivals';
import { ApiFestivalGateway } from '../gateways';

describe('ApiFestivalGateway', () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.saraya.test';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.EXPO_PUBLIC_API_BASE_URL = originalUrl;
  });

  it('forwards list filters through the typed upcoming endpoint', async () => {
    const festival = mockFestivals.find(({ id }) => id === 'kadayawan')!;
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json([festival]),
    );

    await expect(
      new ApiFestivalGateway().list({ search: 'Kadayawan', region: 'Davao Region', month: 8 }),
    ).resolves.toEqual([expect.objectContaining({ id: 'kadayawan' })]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.saraya.test/festivals/upcoming?search=Kadayawan&region=Davao+Region&month=8',
    );
  });

  it('returns complete details and maps HTTP 404 to null', async () => {
    const festival = mockFestivals.find(({ id }) => id === 'sinulog')!;
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json(festival))
      .mockResolvedValueOnce(
        Response.json({ error: { message: 'Festival not found.' } }, { status: 404 }),
      );
    const gateway = new ApiFestivalGateway();

    await expect(gateway.getById('sinulog')).resolves.toEqual(
      expect.objectContaining({ id: 'sinulog' }),
    );
    await expect(gateway.getById('not-a-festival')).resolves.toBeNull();
  });

  it('propagates non-404 API failures', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ error: { message: 'Database unavailable.' } }, { status: 503 }),
    );
    await expect(new ApiFestivalGateway().list({})).rejects.toThrow('Database unavailable.');
  });
});
