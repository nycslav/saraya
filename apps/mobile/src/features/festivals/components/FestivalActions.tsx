import type { FestivalDetailWithCulture, FestivalReminder } from '@saraya/contracts';
import { Bell, BellOff, CalendarPlus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import {
  notificationGateway,
  type NotificationGateway,
} from '@/features/notifications/gateway';
import { Button, SectionTitle, StatusPanel } from '@/ui/components';
import { spacing } from '@/ui/theme';

import {
  festivalReminderGateway,
  type FestivalReminderGateway,
} from '../reminder-gateways';
import {
  festivalCalendarGateway,
  type FestivalCalendarGateway,
  type FestivalCalendarResult,
} from '../services/festival-calendar';

export function FestivalActions({
  festival,
  reminders = festivalReminderGateway,
  calendar = festivalCalendarGateway,
  notifications = notificationGateway,
  now = () => new Date(),
}: {
  festival: FestivalDetailWithCulture;
  reminders?: FestivalReminderGateway;
  calendar?: FestivalCalendarGateway;
  notifications?: NotificationGateway;
  now?: () => Date;
}) {
  const { user } = useAuth();
  const [reminderState, setReminderState] = useState<{
    festivalId: string;
    value: FestivalReminder | null;
  }>();
  const [savingReminder, setSavingReminder] = useState(false);
  const [calendarSaving, setCalendarSaving] = useState(false);
  const [message, setMessage] = useState<ActionMessage>();

  const reminderAvailable = canSetReminder(festival, now());
  const calendarAvailable = canAddToCalendar(festival, now());
  const reminder =
    user && reminderAvailable
      ? reminderState?.festivalId === festival.id
        ? reminderState.value
        : undefined
      : null;

  useEffect(() => {
    if (!user || !reminderAvailable) return;
    let active = true;
    void reminders
      .get(festival.id)
      .then((value) => {
        if (active) setReminderState({ festivalId: festival.id, value });
      })
      .catch(() => {
        if (active) {
          setReminderState({ festivalId: festival.id, value: null });
          setMessage({
            title: 'Reminder unavailable',
            text: 'Saraya could not load your reminder status.',
            tone: 'error',
          });
        }
      });
    return () => {
      active = false;
    };
  }, [festival.id, reminderAvailable, reminders, user]);

  const toggleReminder = async () => {
    if (!user || !reminderAvailable) return;
    setSavingReminder(true);
    setMessage(undefined);
    try {
      if (reminder) {
        await reminders.cancel(festival.id);
        setReminderState({ festivalId: festival.id, value: null });
        setMessage({ title: 'Reminder cancelled', text: 'Saraya will not send this reminder.' });
      } else {
        const preferences = await notifications.enable({ festivalRemindersEnabled: true });
        if (!preferences.festivalRemindersEnabled) {
          setMessage({
            title: 'Notifications remain off',
            text: 'Notification permission was not granted. No Festival reminder was created.',
            tone: 'warning',
          });
          return;
        }
        const created = await reminders.create(festival.id, { leadDays: 1 });
        setReminderState({ festivalId: festival.id, value: created });
        setMessage({
          title: 'Reminder set',
          text: 'Saraya will remind you one day before the confirmed start date.',
          tone: 'success',
        });
      }
    } catch (error) {
      setMessage({
        title: 'Reminder unchanged',
        text: error instanceof Error ? error.message : 'The reminder could not be updated.',
        tone: 'error',
      });
    } finally {
      setSavingReminder(false);
    }
  };

  const addToCalendar = async () => {
    setCalendarSaving(true);
    setMessage(undefined);
    const result = await calendar.add(festival);
    setCalendarSaving(false);
    setMessage(calendarMessage(result));
  };

  return (
    <View style={styles.container}>
      <SectionTitle title="Plan this festival" />
      {!reminderAvailable || !calendarAvailable ? (
        <StatusPanel
          message="Saraya enables exact reminders and calendar events only for a future occurrence with officially confirmed start and end dates. Typical or estimated timing is not converted into a date."
          title="Exact confirmed date required"
          tone="warning"
        />
      ) : null}
      {!user ? (
        <StatusPanel
          message="Sign in to create a Saraya push reminder. Adding a confirmed event to your device calendar remains independent and does not require an account."
          title="Sign in required for reminders"
        />
      ) : null}
      <View style={styles.actions}>
        <Button
          disabled={!user || !reminderAvailable || reminder === undefined}
          icon={reminder ? BellOff : Bell}
          label={reminder ? 'Cancel reminder' : 'Remind me'}
          loading={savingReminder}
          onPress={() => void toggleReminder()}
        />
        <Button
          disabled={!calendarAvailable}
          icon={CalendarPlus}
          label="Add to calendar"
          loading={calendarSaving}
          onPress={() => void addToCalendar()}
          variant="secondary"
        />
      </View>
      {message ? (
        <StatusPanel message={message.text} title={message.title} tone={message.tone} />
      ) : null}
    </View>
  );
}

type ActionMessage = {
  title: string;
  text: string;
  tone?: 'info' | 'success' | 'warning' | 'error';
};

function calendarMessage(result: FestivalCalendarResult): ActionMessage {
  switch (result.status) {
    case 'created':
      return {
        title: 'Added to calendar',
        text: 'The confirmed Festival occurrence was added to your device calendar.',
        tone: 'success',
      };
    case 'duplicate':
      return {
        title: 'Already in calendar',
        text: 'Saraya previously added this confirmed occurrence on this device.',
      };
    case 'denied':
      return {
        title: 'Calendar permission denied',
        text: 'You can continue using Saraya without calendar access.',
        tone: 'warning',
      };
    case 'unavailable':
      return {
        title: 'Calendar unavailable',
        text: 'No writable device calendar or future confirmed occurrence is available.',
        tone: 'warning',
      };
    case 'error':
      return {
        title: 'Calendar unchanged',
        text: 'The event could not be added. Your Festival guide is still available.',
        tone: 'error',
      };
  }
}

function canSetReminder(festival: FestivalDetailWithCulture, now: Date) {
  const startDate = festival.occurrence.confirmedStartDate;
  return Boolean(
    festival.occurrence.scheduleStatus === 'confirmed' &&
      startDate &&
      new Date(`${startDate}T09:00:00+08:00`).getTime() - 24 * 60 * 60 * 1000 > now.getTime(),
  );
}

function canAddToCalendar(festival: FestivalDetailWithCulture, now: Date) {
  const endDate = festival.occurrence.confirmedEndDate;
  return Boolean(
    festival.occurrence.scheduleStatus === 'confirmed' &&
      festival.occurrence.confirmedStartDate &&
      endDate &&
      new Date(`${endDate}T23:59:59+08:00`) >= now,
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  actions: { gap: spacing.sm },
});
