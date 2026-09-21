import { MockBucketListGateway } from '../gateways';

describe('bucket-list gateway', () => {
  it('creates, prioritizes, updates, and removes saved destinations', async () => {
    const gateway = new MockBucketListGateway();
    const low = await gateway.create({ destinationId: 'bohol', priority: 'low' });
    const high = await gateway.create({
      destinationId: 'siargao',
      priority: 'high',
      personalNotes: 'Book a local guide.',
    });

    expect((await gateway.list()).map(({ destinationId }) => destinationId)).toEqual([
      'siargao',
      'bohol',
    ]);

    const updated = await gateway.update(high.id, {
      status: 'visited',
      personalNotes: 'Visited with a local guide.',
    });
    expect(updated).toEqual(expect.objectContaining({
      status: 'visited',
      personalNotes: 'Visited with a local guide.',
    }));

    await gateway.delete(low.id);
    expect(await gateway.list()).toHaveLength(1);
  });

  it('rejects duplicate destination saves', async () => {
    const gateway = new MockBucketListGateway();
    await gateway.create({ destinationId: 'vigan' });

    await expect(gateway.create({ destinationId: 'vigan' })).rejects.toThrow(
      'Destination is already saved.',
    );
  });
});
