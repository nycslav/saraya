import { PostgresBucketListRepository } from '../src/modules/bucket-list/bucket-list.postgres-repository';
import { BucketListDuplicateError } from '../src/modules/bucket-list/bucket-list.errors';

const mockQuery = jest.fn();

jest.mock('../src/platform/database/pool', () => ({
  getPool: () => ({ query: mockQuery }),
}));

const row = {
  id: 'bucket-1',
  user_id: 'demo-user',
  destination_id: 'siargao',
  priority: 'high',
  personal_notes: 'Surf early.',
  status: 'planned',
  added_at: '2026-09-19T00:00:00.000Z',
  updated_at: '2026-09-19T00:00:00.000Z',
};

describe('PostgresBucketListRepository', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('creates and maps a bucket-list item', async () => {
    mockQuery.mockResolvedValue({ rows: [row], rowCount: 1 });

    const result = await new PostgresBucketListRepository().create(
      'demo-user',
      'bucket-1',
      {
        destinationId: 'siargao',
        priority: 'high',
        personalNotes: 'Surf early.',
        status: 'planned',
      },
    );

    expect(result).toEqual(
      expect.objectContaining({ id: 'bucket-1', destinationId: 'siargao' }),
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO bucket_list_items'),
      ['bucket-1', 'demo-user', 'siargao', 'high', 'Surf early.', 'planned'],
    );
  });

  it('maps the database uniqueness constraint to a domain conflict', async () => {
    mockQuery.mockRejectedValue({
      code: '23505',
      constraint: 'bucket_list_items_user_destination_unique',
    });

    await expect(
      new PostgresBucketListRepository().create('demo-user', 'bucket-2', {
        destinationId: 'siargao',
        priority: 'medium',
        personalNotes: '',
        status: 'planned',
      }),
    ).rejects.toBeInstanceOf(BucketListDuplicateError);
  });
});
