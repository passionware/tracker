import {
  type ZonedDateTime,
  getLocalTimeZone,
  fromAbsolute,
} from "@internationalized/date";

export interface TimelineItem<Data = unknown> {
  id: string;
  laneId: string;
  start: ZonedDateTime;
  end: ZonedDateTime;
  label: string;
  color?: string;
  row?: number;
  data: Data;
}

export interface TimelineItemInternal<Data = unknown> {
  id: string;
  laneId: string;
  start: number;
  end: number;
  label: string;
  color?: string;
  row?: number;
  data: Data;
}

export interface DragState<Data = unknown> {
  type: "move" | "resize-start" | "resize-end" | "draw";
  itemId?: string;
  laneId?: string;
  startX: number;
  startTime: number;
  originalItem?: TimelineItemInternal<Data>;
  drawStart?: number;
  hasCrossedThreshold?: boolean;
}

export type SnapOption = "none" | "5min" | "15min" | "30min" | "1hour" | "1day";

export const PIXELS_PER_MINUTE = 2;
/** Minimum zoom (ctrl+scroll / pinch). Lower = more time visible (e.g. many years). */
export const TIMELINE_ZOOM_MIN = 0.00005;
/** Maximum zoom */
export const TIMELINE_ZOOM_MAX = 4;
export const MIN_ITEM_DURATION = 5;
export const DRAG_THRESHOLD = 5;
export const LANE_HEIGHT = 70;
export const SUB_ROW_HEIGHT = 28;
export const HEADER_HEIGHT = 48;
export const SIDEBAR_WIDTH = 180;

export const SNAP_VALUES: Record<SnapOption, number> = {
  none: 0,
  "5min": 5,
  "15min": 15,
  "30min": 30,
  "1hour": 60,
  "1day": 1440,
};

export const ITEM_COLORS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
];

export const BASE_DATE = new Date(2025, 0, 27, 8, 0);

export function toMinutes(hours: number, mins = 0): number {
  return hours * 60 + mins;
}

export function zonedDateTimeToMinutes(
  zonedDateTime: ZonedDateTime,
  baseDate: ZonedDateTime,
): number {
  const baseMs = baseDate.toDate().getTime();
  const dateMs = zonedDateTime.toDate().getTime();
  return Math.floor((dateMs - baseMs) / (1000 * 60));
}

export function minutesToZonedDateTime(
  minutes: number,
  baseDate: ZonedDateTime,
): ZonedDateTime {
  const baseMs = baseDate.toDate().getTime();
  const targetMs = baseMs + minutes * 60 * 1000;
  return fromAbsolute(targetMs, baseDate.timeZone);
}

export function dateToZonedDateTime(
  date: Date,
  timeZone: string = getLocalTimeZone(),
): ZonedDateTime {
  return fromAbsolute(date.getTime(), timeZone);
}

export function zonedDateTimeToDate(zonedDateTime: ZonedDateTime): Date {
  return zonedDateTime.toDate();
}

export function minutesToDate(minutes: number, baseDate: ZonedDateTime): Date {
  const zonedDateTime = minutesToZonedDateTime(minutes, baseDate);
  return zonedDateTime.toDate();
}

export function toInternalItem<Data>(
  item: TimelineItem<Data>,
  baseDate: ZonedDateTime,
): TimelineItemInternal<Data> {
  return {
    ...item,
    start: zonedDateTimeToMinutes(item.start, baseDate),
    end: zonedDateTimeToMinutes(item.end, baseDate),
  };
}

export function toExternalItem<Data>(
  item: TimelineItemInternal<Data>,
  baseDate: ZonedDateTime,
): TimelineItem<Data> {
  return {
    ...item,
    start: minutesToZonedDateTime(item.start, baseDate),
    end: minutesToZonedDateTime(item.end, baseDate),
  };
}

/**
 * Sub-row stacking in minutes. Range↔range: touching endpoints may share a row.
 * Instant items (start === end): overlap at the same minute, or a point strictly inside a range.
 */
export function timelineItemsTimeOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number },
): boolean {
  const aPoint = a.start === a.end;
  const bPoint = b.start === b.end;
  if (aPoint && bPoint) {
    return a.start === b.start;
  }
  if (aPoint) {
    return b.start < a.start && a.start < b.end;
  }
  if (bPoint) {
    return a.start < b.start && b.start < a.end;
  }
  return !(a.end <= b.start || a.start >= b.end);
}

export function formatTime(minutes: number): string {
  const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedMinutes / 60);
  const mins = normalizedMinutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, "0")} ${period}`;
}

export function formatDate(minutes: number, baseDate: ZonedDateTime): string {
  const zonedDateTime = minutesToZonedDateTime(minutes, baseDate);
  const date = zonedDateTimeToDate(zonedDateTime);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatMonthYear(minutes: number, baseDate: ZonedDateTime): string {
  const zonedDateTime = minutesToZonedDateTime(minutes, baseDate);
  const date = zonedDateTimeToDate(zonedDateTime);
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function formatYear(minutes: number, baseDate: ZonedDateTime): string {
  const zonedDateTime = minutesToZonedDateTime(minutes, baseDate);
  const date = zonedDateTimeToDate(zonedDateTime);
  return date.getFullYear().toString();
}

/** Calendar quarter tick label (year is shown on the upper ruler row). */
export function formatQuarter(minutes: number, baseDate: ZonedDateTime): string {
  const zonedDateTime = minutesToZonedDateTime(minutes, baseDate);
  const date = zonedDateTimeToDate(zonedDateTime);
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `Q${q}`;
}

export function formatWeek(minutes: number, baseDate: ZonedDateTime): string {
  const zonedDateTime = minutesToZonedDateTime(minutes, baseDate);
  const date = zonedDateTimeToDate(zonedDateTime);
  const dayOfWeek = date.getDay();
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - dayOfWeek);
  return startOfWeek.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function getDayStart(minutes: number): number {
  return Math.floor(minutes / 1440) * 1440;
}
