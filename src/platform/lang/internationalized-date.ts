import {
  CalendarDate,
  getLocalTimeZone,
  isSameDay,
  parseDate,
  today,
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
