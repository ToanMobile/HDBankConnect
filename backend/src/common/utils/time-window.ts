const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Convert an ISO timestamp to a Vietnam date string (YYYY-MM-DD).
 * Uses sv-SE locale which produces YYYY-MM-DD naturally.
 */
export function toVietnamDate(isoTimestamp: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: VN_TIMEZONE,
  }).format(new Date(isoTimestamp));
}

/**
 * Get Vietnam local time as HH:MM string.
 */
export function toVietnamTime(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleTimeString('en-GB', {
    timeZone: VN_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Compute the timezone offset (in ms) for a given Date in a given IANA zone.
 * For Asia/Ho_Chi_Minh, returns +7h worth of ms (25200000).
 */
function getTimezoneOffsetMs(date: Date, timezone: string): number {
  // sv-SE format is "YYYY-MM-DD HH:MM:SS"
  const localStr = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
  const utcStr = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
  // Both strings are ambiguous ISO-ish, parse as UTC for consistent math
  const localMs = Date.parse(localStr.replace(' ', 'T') + 'Z');
  const utcMs = Date.parse(utcStr.replace(' ', 'T') + 'Z');
  return localMs - utcMs;
}

/**
 * Parse a schedule HH:MM on a given local date (in target timezone) and
 * return the UTC Date representing that local instant.
 */
function parseScheduleDateTime(
  date: string,
  time: string,
  timezone: string,
): Date {
  // Pretend the local time is UTC to get a reference timestamp
  const naive = new Date(`${date}T${time.padStart(5, '0')}:00Z`);
  const offset = getTimezoneOffsetMs(naive, timezone);
  // Subtract offset: if timezone is +7, scheduled UTC = naive - 7h
  return new Date(naive.getTime() - offset);
}

/**
 * Check if a given ISO timestamp falls within the time window around a schedule time.
 */
export function isWithinTimeWindow(
  timestamp: string,
  scheduleTime: string,
  windowMinutes: number,
  timezone: string = VN_TIMEZONE,
): boolean {
  const checkDate = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
  }).format(new Date(timestamp));
  const scheduleDateTime = parseScheduleDateTime(
    checkDate,
    scheduleTime,
    timezone,
  );
  const checkMs = new Date(timestamp).getTime();
  const scheduleMs = scheduleDateTime.getTime();
  const windowMs = windowMinutes * 60 * 1000;

  return checkMs >= scheduleMs - windowMs && checkMs <= scheduleMs + windowMs;
}

/**
 * Get the number of minutes late relative to a scheduled time.
 * Returns 0 if on time or early, positive if late.
 */
export function getMinutesLate(
  timestamp: string,
  scheduleTime: string,
  timezone: string = VN_TIMEZONE,
): number {
  const checkDate = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
  }).format(new Date(timestamp));
  const scheduleDateTime = parseScheduleDateTime(
    checkDate,
    scheduleTime,
    timezone,
  );
  const checkMs = new Date(timestamp).getTime();
  const scheduleMs = scheduleDateTime.getTime();
  const diffMs = checkMs - scheduleMs;
  return diffMs > 0 ? Math.round(diffMs / 60000) : 0;
}

/**
 * Get Vietnam day-of-week (0=Sunday, 1=Monday ... 6=Saturday).
 */
export function getVietnamDayOfWeek(isoTimestamp: string): number {
  // en-US short weekday then map
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: VN_TIMEZONE,
    weekday: 'short',
  }).format(new Date(isoTimestamp));
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[weekday] ?? 0;
}
