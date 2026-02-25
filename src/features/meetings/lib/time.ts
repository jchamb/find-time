export const DAYS_OF_WEEK = [
  { value: 0, shortLabel: 'Sun', longLabel: 'Sunday' },
  { value: 1, shortLabel: 'Mon', longLabel: 'Monday' },
  { value: 2, shortLabel: 'Tue', longLabel: 'Tuesday' },
  { value: 3, shortLabel: 'Wed', longLabel: 'Wednesday' },
  { value: 4, shortLabel: 'Thu', longLabel: 'Thursday' },
  { value: 5, shortLabel: 'Fri', longLabel: 'Friday' },
  { value: 6, shortLabel: 'Sat', longLabel: 'Saturday' },
] as const;

export const SLOT_MINUTE_OPTIONS = [15, 30, 60] as const;

export const pad2 = (value: number): string => String(value).padStart(2, '0');

export const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const isClockTime = (value: string): boolean => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);

export const isAlignedToSlot = (time: string, slotMinutes: number): boolean => {
  if (!isClockTime(time)) return false;
  return toMinutes(time) % slotMinutes === 0;
};

export const makeTimeOptions = (slotMinutes: number): string[] => {
  const safeSlot = Number.isFinite(slotMinutes) && slotMinutes > 0 ? slotMinutes : 30;
  const result: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += safeSlot) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    result.push(`${pad2(hours)}:${pad2(mins)}`);
  }
  return result;
};

export const makeSlotLabel = (dayOfWeek: number, startTime: string): string => {
  const day = DAYS_OF_WEEK.find(item => item.value === dayOfWeek);
  return `${day?.shortLabel ?? '?'} ${startTime}`;
};

export const convertTo12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
};

// Timezone offset map (in hours, not accounting for DST)
const TIMEZONE_OFFSETS: Record<string, number> = {
  UTC: 0,
  EST: -5,
  EDT: -4,
  CST: -6,
  CDT: -5,
  MST: -7,
  MDT: -6,
  PST: -8,
  PDT: -7,
};

/**
 * Get the current UTC offset for a given timezone
 */
export const getTimezoneOffset = (timezone: string): number => {
  const offset = TIMEZONE_OFFSETS[timezone];
  if (offset === undefined) return 0; // Default to UTC
  return offset;
};

/**
 * Convert a time from one timezone to another
 * Returns the time in HH:MM format
 */
export const convertTimeToTimezone = (time24: string, fromTimezone: string, toTimezone: string): string => {
  const fromOffset = getTimezoneOffset(fromTimezone);
  const toOffset = getTimezoneOffset(toTimezone);
  const offsetDiff = toOffset - fromOffset; // hours

  const [hours, minutes] = time24.split(':').map(Number);
  let newHours = hours + offsetDiff;

  // Handle day wraparound (we only return time, not date)
  newHours = ((newHours % 24) + 24) % 24;

  return `${pad2(newHours)}:${pad2(minutes)}`;
};

/**
 * Get user's local timezone abbreviation
 */
export const getUserTimezone = (): string => {
  // Try to detect from the user's locale settings
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZoneName: 'short',
  });
  const parts = formatter.formatToParts(new Date());
  const timeZonePart = parts.find(part => part.type === 'timeZoneName');
  return timeZonePart?.value ?? 'UTC';
};
