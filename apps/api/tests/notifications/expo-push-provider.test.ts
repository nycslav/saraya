import { ExpoPushNotificationProvider } from '../../src/integrations/notifications';

const message = (to: string) => ({ to, title: 'Alert', body: 'Take care', data: { type: 'safety_alert' as const, alertId: 'a-1' } });

describe('ExpoPushNotificationProvider', () => {
  it('normalizes accepted, partial failure, and invalid-device tickets', async () => {
    const transport = jest.fn(async () => new Response(JSON.stringify({ data: [
      { status: 'ok', id: 'ticket-1' },
      { status: 'error', message: 'Gone', details: { error: 'DeviceNotRegistered' } },
    ] }), { status: 200 }));
    const results = await new ExpoPushNotificationProvider(transport as typeof fetch).send([
      message('ExpoPushToken[one]'), message('ExpoPushToken[two]'),
    ]);
    expect(results).toEqual([
      expect.objectContaining({ status: 'accepted', ticketId: 'ticket-1' }),
      expect.objectContaining({ status: 'failed', shouldDeactivateToken: true }),
    ]);
    const firstCall = transport.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(firstCall[1].body))[0]).toEqual(expect.objectContaining({ sound: 'default', priority: 'high' }));
  });

  it('normalizes network failures without a real request', async () => {
    const transport = jest.fn(async () => { throw new Error('offline'); });
    await expect(new ExpoPushNotificationProvider(transport as typeof fetch).send([message('ExpoPushToken[one]')]))
      .resolves.toEqual([expect.objectContaining({ status: 'failed', errorCode: 'NETWORK_ERROR' })]);
  });

  it('times out a stalled transport', async () => {
    const transport = jest.fn((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));
    await expect(new ExpoPushNotificationProvider(transport as typeof fetch, 1).send([message('ExpoPushToken[one]')]))
      .resolves.toEqual([expect.objectContaining({ status: 'failed', errorCode: 'TIMEOUT' })]);
  });

  it('batches more than 100 messages', async () => {
    const transport = jest.fn(async (_url, init) => {
      const sent = JSON.parse(String(init?.body)) as unknown[];
      return new Response(JSON.stringify({ data: sent.map((_, index) => ({ status: 'ok', id: String(index) })) }), { status: 200 });
    });
    await new ExpoPushNotificationProvider(transport as typeof fetch).send(Array.from({ length: 101 }, (_, index) => message(`ExpoPushToken[t${index}]`)));
    expect(transport).toHaveBeenCalledTimes(2);
  });
});
