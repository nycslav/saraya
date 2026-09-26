import { mockFestivals } from '../data/mockFestivals';
import {
  ExpoFestivalCalendarGateway,
  type FestivalCalendarNativeProvider,
  type FestivalCalendarStorage,
} from '../services/festival-calendar';

jest.mock('expo-calendar', () => ({
  EntityTypes: { EVENT: 'event' },
  getCalendarPermissions: jest.fn(),
  requestCalendarPermissions: jest.fn(),
  getCalendars: jest.fn(),
}));

function setup({ permission = 'granted', canAskAgain = true, existingId = null as string | null } = {}) {
  const createEvent = jest.fn().mockResolvedValue({ id: 'event-1' });
  const native: FestivalCalendarNativeProvider = {
    getPermission: jest.fn().mockResolvedValue({ status: permission, canAskAgain }),
    requestPermission: jest.fn().mockResolvedValue({ status: 'granted' }),
    getWritableCalendars: jest.fn().mockResolvedValue([
      { id: 'calendar-1', allowsModifications: true, isPrimary: true, createEvent },
    ]),
  };
  const storage: FestivalCalendarStorage = {
    getItem: jest.fn().mockResolvedValue(existingId),
    setItem: jest.fn().mockResolvedValue(undefined),
  };
  const gateway = new ExpoFestivalCalendarGateway(
    native,
    storage,
    () => new Date('2026-09-25T00:00:00.000Z'),
  );
  return { gateway, native, storage, createEvent };
}

describe('festival calendar boundary', () => {
  const masskara = mockFestivals.find(({ id }) => id === 'masskara')!;
  const moriones = mockFestivals.find(({ id }) => id === 'moriones')!;

  it('uses existing permission and creates an all-day event from confirmed dates', async () => {
    const { gateway, native, storage, createEvent } = setup();

    await expect(gateway.add(masskara)).resolves.toEqual({
      status: 'created',
      eventId: 'event-1',
    });
    expect(native.requestPermission).not.toHaveBeenCalled();
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'MassKara Festival',
        allDay: true,
        timeZone: 'Asia/Manila',
        location: 'Bacolod City, Negros Occidental',
        startDate: new Date('2026-10-01T00:00:00+08:00'),
        endDate: new Date('2026-10-19T00:00:00+08:00'),
      }),
    );
    expect(storage.setItem).toHaveBeenCalledWith(expect.stringContaining('masskara'), 'event-1');
  });

  it('requests permission only when the explicit add action reaches the boundary', async () => {
    const { gateway, native } = setup({ permission: 'undetermined' });
    expect(native.getPermission).not.toHaveBeenCalled();
    await gateway.add(masskara);
    expect(native.getPermission).toHaveBeenCalledTimes(1);
    expect(native.requestPermission).toHaveBeenCalledTimes(1);
  });

  it('handles denied permission without creating an event', async () => {
    const { gateway, native, createEvent } = setup({ permission: 'denied', canAskAgain: false });
    await expect(gateway.add(masskara)).resolves.toEqual({ status: 'denied' });
    expect(native.requestPermission).not.toHaveBeenCalled();
    expect(createEvent).not.toHaveBeenCalled();
  });

  it('rejects recurring or past timing before requesting permission', async () => {
    const { gateway, native } = setup();
    await expect(gateway.add(moriones)).resolves.toEqual({ status: 'unavailable' });
    expect(native.getPermission).not.toHaveBeenCalled();
  });

  it('prevents duplicate creation using the preserved native event ID', async () => {
    const { gateway, native, createEvent } = setup({ existingId: 'event-existing' });
    await expect(gateway.add(masskara)).resolves.toEqual({
      status: 'duplicate',
      eventId: 'event-existing',
    });
    expect(native.getPermission).not.toHaveBeenCalled();
    expect(createEvent).not.toHaveBeenCalled();
  });

  it('handles missing writable calendars and native failures', async () => {
    const unavailable = setup();
    (unavailable.native.getWritableCalendars as jest.Mock).mockResolvedValue([]);
    await expect(unavailable.gateway.add(masskara)).resolves.toEqual({ status: 'unavailable' });

    const failed = setup();
    (failed.native.getPermission as jest.Mock).mockRejectedValue(new Error('native failure'));
    await expect(failed.gateway.add(masskara)).resolves.toEqual({ status: 'error' });
  });
});
