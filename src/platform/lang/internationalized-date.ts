import {
  CalendarDate,
  getLocalTimeZone,
  isSameDay,
  parseDate,
  today,
  toZoned,
} from "@internationalized/date";

export function dateToCalendarDate(date: Date): CalendarDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return parseDate(`${year}-${month}-${day}`);
}

export function calendarDateToJSDate(date: CalendarDate): Date {
  return date.toDate(getLocalTimeZone());
}

/**
 * Epoch-ms range for charts that must match Passionware timeline layout: `CalendarDate`
 * start/end are inclusive days; layout ends at the first instant of the day after `periodEnd`.
 * Pass the Passionware timeline store’s `timeZone` (not only the browser default) so chart
 * X domains match bar `left`/`width` geometry.
 */
export function inclusiveCalendarPeriodToEpochRange(
  periodStart: CalendarDate,
  periodEnd: CalendarDate,
  timeZone: string = getLocalTimeZone(),
): { start: number; end: number } {
  const startZ = toZoned(periodStart, timeZone);
  const endZ = toZoned(periodEnd.add({ days: 1 }), timeZone);
  return {
    start: startZ.toDate().getTime(),
    end: endZ.toDate().getTime(),
  };
}

export function addDaysToCalendarDate(
  date: CalendarDate,
  days: number,
): CalendarDate {
  return date.add({ days });
}

export function isSameCalendarDate(
  date1: CalendarDate,
  date2: CalendarDate,
): boolean {
  return isSameDay(date1, date2);
}

export function todayCalendarDate(): CalendarDate {
  return today(getLocalTimeZone());
}
