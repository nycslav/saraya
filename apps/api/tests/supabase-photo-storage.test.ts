import { SupabasePhotoStorage } from '../src/integrations/photo-storage/supabase-photo-storage';

describe('SupabasePhotoStorage', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.PHOTO_STORAGE_BUCKET = 'journey-photos';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('uploads a private object and returns the stable API photo route', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const storage = new SupabasePhotoStorage();

    const photoUrl = await storage.save({
      mimetype: 'image/jpeg',
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    } as Express.Multer.File);

    expect(photoUrl).toMatch(/^\/uploads\/check-ins\/.+\.jpg$/);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(
        /^https:\/\/example\.supabase\.co\/storage\/v1\/object\/journey-photos\/check-ins\/.+\.jpg$/,
      ),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          apikey: 'test-service-key',
          authorization: 'Bearer test-service-key',
          'content-type': 'image/jpeg',
        }),
      }),
    );
  });

  it('downloads private objects through the authenticated storage route', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(
      new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      { status: 200, headers: { 'content-type': 'image/jpeg' } },
    ));
    const storage = new SupabasePhotoStorage();

    const photo = await storage.read('memory.jpg');

    expect(photo.contentType).toBe('image/jpeg');
    expect(photo.body).toEqual(Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.supabase.co/storage/v1/object/authenticated/journey-photos/check-ins/memory.jpg',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer test-service-key' }),
      }),
    );
  });
});
