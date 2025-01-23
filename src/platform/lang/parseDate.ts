import { isValid, parse, parseISO } from "date-fns";

const commonFormats = ["dd.MM.yyyy", "MM/dd/yyyy", "yyyy-MM-dd"];

export function parseDate(date: string): Date {
  // First, attempt to parse ISO 8601 dates using parseISO
  const parsedISO = parseISO(date);
  if (isValid(parsedISO)) {
    return parsedISO;
  }

  for (const format of commonFormats) {
    const parsed = parse(date, format, new Date());
    if (isValid(parsed)) {
      return parsed;
    }
  }
  throw new Error(`Invalid date format: ${date}`);
}

export function newDate(value: string): Date {
  return new Date(value);
}
