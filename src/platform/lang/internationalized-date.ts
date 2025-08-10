import {
  CalendarDate,
  getLocalTimeZone,
  parseDate,
} from "@internationalized/date";

export function dateToCalendarDate(date: Date): CalendarDate {
  return parseDate(date.toISOString());
}

export function calendarDateToJSDate(date: CalendarDate): Date {
  return date.toDate(getLocalTimeZone());
}
