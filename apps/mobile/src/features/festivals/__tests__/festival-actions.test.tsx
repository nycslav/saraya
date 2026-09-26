import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { NotificationGateway } from '@/features/notifications/gateway';

import { FestivalActions } from '../components/FestivalActions';
import { mockFestivals } from '../data/mockFestivals';
import type { FestivalReminderGateway } from '../reminder-gateways';
import type { FestivalCalendarGateway } from '../services/festival-calendar';

let mockUser: { id: string } | null = { id: 'user-1' };

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser, restoring: false }),
}));
jest.mock('@/features/notifications/gateway', () => ({
  notificationGateway: {
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
    enable: jest.fn(),
    registerCurrentToken: jest.fn(),
  },
}));
jest.mock('expo-calendar', () => ({
  EntityTypes: { EVENT: 'event' },
  getCalendarPermissions: jest.fn(),
  requestCalendarPermissions: jest.fn(),
  getCalendars: jest.fn(),
}));

const masskara = mockFestivals.find(({ id }) => id === 'masskara')!;
const moriones = mockFestivals.find(({ id }) => id === 'moriones')!;
const activeReminder = {
  id: '00000000-0000-4000-8000-000000000001',
  festivalId: 'masskara',
  leadDays: 1 as const,
  remindAt: '2026-09-30T01:00:00.000Z',
  status: 'active' as const,
  sentAt: null,
  createdAt: '2026-09-20T00:00:00.000Z',
  updatedAt: '2026-09-20T00:00:00.000Z',
};
const now = () => new Date('2026-09-25T00:00:00.000Z');

function setup({ existing = null as typeof activeReminder | null } = {}) {
  const reminders: FestivalReminderGateway = {
    create: jest.fn().mockResolvedValue(activeReminder),
    get: jest.fn().mockResolvedValue(existing),
    cancel: jest.fn().mockResolvedValue(undefined),
    list: jest.fn().mockResolvedValue(existing ? [existing] : []),
  };
  const calendar: FestivalCalendarGateway = {
    add: jest.fn().mockResolvedValue({ status: 'created', eventId: 'event-1' }),
  };
  const notifications: NotificationGateway = {
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
    enable: jest.fn().mockResolvedValue({
      safetyAlertsEnabled: false,
      festivalRemindersEnabled: true,
    }),
    registerCurrentToken: jest.fn(),
  };
  return { reminders, calendar, notifications };
}

describe('FestivalActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 'user-1' };
  });

  it('enables notifications contextually and creates a reminder', async () => {
    const dependencies = setup();
    await render(<FestivalActions festival={masskara} now={now} {...dependencies} />);

    const button = await screen.findByRole('button', { name: 'Remind me' });
    await act(async () => {
      fireEvent.press(button);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(dependencies.notifications.enable).toHaveBeenCalledWith({
      festivalRemindersEnabled: true,
    });
    expect(dependencies.reminders.create).toHaveBeenCalledWith('masskara', { leadDays: 1 });
    expect(await screen.findByText('Reminder set')).toBeTruthy();
  });

  it('cancels an active reminder', async () => {
    const dependencies = setup({ existing: activeReminder });
    await render(<FestivalActions festival={masskara} now={now} {...dependencies} />);

    const cancel = await screen.findByRole('button', { name: 'Cancel reminder' });
    await act(async () => {
      fireEvent.press(cancel);
      await Promise.resolve();
    });
    expect(dependencies.reminders.cancel).toHaveBeenCalledWith('masskara');
    expect(await screen.findByText('Reminder cancelled')).toBeTruthy();
  });

  it('shows permission denial and successful calendar creation', async () => {
    const denied = setup();
    (denied.calendar.add as jest.Mock).mockResolvedValue({ status: 'denied' });
    const first = await render(<FestivalActions festival={masskara} now={now} {...denied} />);
    const deniedButton = await screen.findByRole('button', { name: 'Add to calendar' });
    await act(async () => {
      fireEvent.press(deniedButton);
      await Promise.resolve();
    });
    expect(await screen.findByText('Calendar permission denied')).toBeTruthy();
    await first.unmount();

    const created = setup();
    await render(<FestivalActions festival={masskara} now={now} {...created} />);
    const createdButton = await screen.findByRole('button', { name: 'Add to calendar' });
    await act(async () => {
      fireEvent.press(createdButton);
      await Promise.resolve();
    });
    expect(await screen.findByText('Added to calendar')).toBeTruthy();
  });

  it('keeps exact-date actions unavailable for recurring timing', async () => {
    const dependencies = setup();
    await render(<FestivalActions festival={moriones} now={now} {...dependencies} />);
    expect(await screen.findByText('Exact confirmed date required')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remind me' }).props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    expect(
      screen.getByRole('button', { name: 'Add to calendar' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ disabled: true }));
  });

  it('reports API errors without losing Festival content', async () => {
    const dependencies = setup();
    (dependencies.reminders.create as jest.Mock).mockRejectedValue(new Error('API unavailable'));
    await render(<FestivalActions festival={masskara} now={now} {...dependencies} />);
    const button = await screen.findByRole('button', { name: 'Remind me' });
    await act(async () => {
      fireEvent.press(button);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(await screen.findByText('API unavailable')).toBeTruthy();
    expect(screen.getByText('Plan this festival')).toBeTruthy();
  });

  it('requires sign-in only for the Saraya reminder', async () => {
    mockUser = null;
    const dependencies = setup();
    await render(<FestivalActions festival={masskara} now={now} {...dependencies} />);
    expect(await screen.findByText('Sign in required for reminders')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remind me' }).props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    expect(screen.getByRole('button', { name: 'Add to calendar' }).props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false }),
    );
  });
});
