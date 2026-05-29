import { eachDayOfInterval, isWeekend, startOfDay } from "date-fns";

/** Inclusive Mon–Fri count between two instants (local `startOfDay` bounds). */
export function inclusiveWeekdayCount(startMs: number, endMs: number): number {
  const start = startOfDay(new Date(Math.min(startMs, endMs)));
  const end = startOfDay(new Date(Math.max(startMs, endMs)));
  if (end < start) return 0;
  return eachDayOfInterval({ start, end }).filter((d) => !isWeekend(d)).length;
}
