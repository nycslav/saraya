import type { FestivalOccurrence, FestivalSummary } from '@saraya/contracts';

const monthFormatter = new Intl.DateTimeFormat('en-PH', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatFestivalDate(value: string) {
  return monthFormatter.format(parseDate(value));
}

export function formatFestivalDateRange(startDate: string, endDate: string) {
  if (startDate === endDate) return formatFestivalDate(startDate);

  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();

  if (sameMonth) {
    return `${start.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', timeZone: 'UTC' })}–${end.getUTCDate()}, ${end.getUTCFullYear()}`;
  }

  if (sameYear) {
    return `${start.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', timeZone: 'UTC' })}–${end.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', timeZone: 'UTC' })}, ${end.getUTCFullYear()}`;
  }

  return `${formatFestivalDate(startDate)}–${formatFestivalDate(endDate)}`;
}

export function canCreateExactFestivalCalendarEvent(occurrence: FestivalOccurrence) {
  return Boolean(
    occurrence.scheduleStatus === 'confirmed' &&
    occurrence.scheduleYear &&
    occurrence.confirmedStartDate &&
    occurrence.confirmedEndDate,
  );
}

export function getFestivalSchedulePresentation(
  festival: Pick<FestivalSummary, 'recurrenceDescription' | 'occurrence'>,
) {
  const { occurrence, recurrenceDescription } = festival;
  const year = occurrence.scheduleYear;

  switch (occurrence.scheduleStatus) {
    case 'confirmed': {
      const dateRange = formatFestivalDateRange(
        occurrence.confirmedStartDate!,
        occurrence.confirmedEndDate!,
      );
      return {
        shortLabel: `${dateRange} · confirmed`,
        title: `${year} schedule confirmed`,
        message: `${dateRange}. ${occurrence.verificationNote}`,
        tone: 'success' as const,
      };
    }
    case 'estimated':
      return {
        shortLabel: `Expected: ${occurrence.estimatedDateDescription}`,
        title: 'Expected period — verify before travel',
        message: occurrence.verificationNote,
        tone: 'warning' as const,
      };
    case 'cancelled':
      return {
        shortLabel: `${year ?? 'Represented'} occurrence cancelled`,
        title: `${year ?? 'Festival'} occurrence cancelled`,
        message: occurrence.verificationNote,
        tone: 'error' as const,
      };
    case 'unknown':
      return {
        shortLabel: 'Schedule unknown',
        title: 'Schedule not available',
        message: occurrence.verificationNote,
        tone: 'warning' as const,
      };
    case 'recurring':
      return {
        shortLabel: `Typically ${recurrenceDescription}`,
        title: `Typically ${recurrenceDescription}`,
        message: `The exact ${year ?? 'current-year'} schedule has not been confirmed. ${occurrence.verificationNote}`,
        tone: 'warning' as const,
      };
  }
}
