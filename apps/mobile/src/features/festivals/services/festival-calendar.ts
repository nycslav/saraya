import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FestivalDetailWithCulture } from '@saraya/contracts';
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

export type FestivalCalendarResult =
  | { status: 'created'; eventId: string }
  | { status: 'duplicate'; eventId: string }
  | { status: 'denied' | 'unavailable' | 'error' };

type CalendarPermission = { status: string; canAskAgain?: boolean };
type WritableCalendar = {
  id: string;
  allowsModifications: boolean;
  isPrimary?: boolean;
  createEvent(details: Record<string, unknown>): Promise<{ id: string }>;
};

export interface FestivalCalendarNativeProvider {
  getPermission(): Promise<CalendarPermission>;
  requestPermission(): Promise<CalendarPermission>;
  getWritableCalendars(): Promise<WritableCalendar[]>;
}

export interface FestivalCalendarStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface FestivalCalendarGateway {
  add(festival: FestivalDetailWithCulture): Promise<FestivalCalendarResult>;
}

export class ExpoFestivalCalendarNativeProvider implements FestivalCalendarNativeProvider {
  getPermission() {
    return Calendar.getCalendarPermissions(true);
  }

  requestPermission() {
    return Calendar.requestCalendarPermissions(true);
  }

  async getWritableCalendars(): Promise<WritableCalendar[]> {
    return Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  }
}

export class ExpoFestivalCalendarGateway implements FestivalCalendarGateway {
  constructor(
    private readonly native: FestivalCalendarNativeProvider =
      new ExpoFestivalCalendarNativeProvider(),
    private readonly storage: FestivalCalendarStorage = AsyncStorage,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async add(festival: FestivalDetailWithCulture): Promise<FestivalCalendarResult> {
    const occurrence = festival.occurrence;
    if (
      Platform.OS === 'web' ||
      occurrence.scheduleStatus !== 'confirmed' ||
      !occurrence.confirmedStartDate ||
      !occurrence.confirmedEndDate ||
      new Date(`${occurrence.confirmedEndDate}T23:59:59+08:00`) < this.now()
    ) {
      return { status: 'unavailable' };
    }

    const key = calendarStorageKey(
      festival.id,
      occurrence.confirmedStartDate,
      occurrence.confirmedEndDate,
    );
    try {
      const existingId = await this.storage.getItem(key);
      if (existingId) return { status: 'duplicate', eventId: existingId };

      let permission = await this.native.getPermission();
      if (permission.status !== 'granted') {
        if (permission.canAskAgain === false) return { status: 'denied' };
        permission = await this.native.requestPermission();
      }
      if (permission.status !== 'granted') return { status: 'denied' };

      const calendars = (await this.native.getWritableCalendars()).filter(
        (candidate) => candidate.allowsModifications,
      );
      const calendar = calendars.find((candidate) => candidate.isPrimary) ?? calendars[0];
      if (!calendar) return { status: 'unavailable' };

      const event = await calendar.createEvent({
        title: festival.name,
        startDate: new Date(`${occurrence.confirmedStartDate}T00:00:00+08:00`),
        endDate: new Date(`${nextDate(occurrence.confirmedEndDate)}T00:00:00+08:00`),
        allDay: true,
        timeZone: 'Asia/Manila',
        location: `${festival.city}, ${festival.province}`,
        notes: `${festival.summary}\n\n${occurrence.verificationNote}`,
      });
      await this.storage.setItem(key, event.id);
      return { status: 'created', eventId: event.id };
    } catch {
      return { status: 'error' };
    }
  }
}

function calendarStorageKey(festivalId: string, startDate: string, endDate: string) {
  return `saraya.festival-calendar.${festivalId}.${startDate}.${endDate}`;
}

function nextDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export const festivalCalendarGateway: FestivalCalendarGateway =
  new ExpoFestivalCalendarGateway();
