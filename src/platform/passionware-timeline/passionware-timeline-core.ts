import {
  CalendarDate,
  type ZonedDateTime,
  getLocalTimeZone,
  fromAbsolute,
  toZoned,
} from "@internationalized/date";

/** Wall-clock instant or calendar day (start of that day in a zone when converted). */
export type TimelineTemporal = ZonedDateTime | CalendarDate;

export function timelineTemporalToZoned(
  value: TimelineTemporal,
  timeZone: string,
): ZonedDateTime {
  return value instanceof CalendarDate ? toZoned(value, timeZone) : value;
}

function resolveLayoutAndSemanticEnd(
  end: TimelineTemporal,
  layoutExclusiveEnd: ZonedDateTime | undefined,
  timeZone: string,
): { layoutEndZoned: ZonedDateTime; semanticEndZoned: ZonedDateTime | undefined } {
  if (layoutExclusiveEnd != null) {
    return {
      layoutEndZoned: layoutExclusiveEnd,
      semanticEndZoned: timelineTemporalToZoned(end, timeZone),
    };
  }
  if (end instanceof CalendarDate) {
    return {
      layoutEndZoned: toZoned(end.add({ days: 1 }), timeZone),
      semanticEndZoned: toZoned(end, timeZone),
    };
  }
  return {
    layoutEndZoned: end,
    semanticEndZoned: undefined,
  };
}

export interface TimelineItem<Data = unknown> {
  id: string;
  laneId: string;
  start: TimelineTemporal;
  /**
   * Range end: `ZonedDateTime` = instant; `CalendarDate` = inclusive last calendar day
   * (layout extends to the start of the next day unless `layoutExclusiveEnd` is set).
   */
  end: TimelineTemporal;
  /**
   * When set, bar width / overlap / stacking use this **exclusive** right edge (e.g. first instant of
   * the day after a calendar `end` date). Callbacks and `toExternalItem` still expose `end` only —
   * this field is not part of the public event range.
   */
  layoutExclusiveEnd?: ZonedDateTime;
  label: string;
  color?: string;
  row?: number;
  data: Data;
}

export interface TimelineItemInternal<Data = unknown> {
  id: string;
  laneId: string;
  start: number;
  /** Layout end in minutes (exclusive when `semanticEndMinutes` is set). */
  end: number;
  /** When set, `toExternalItem` maps `end` from this instead of `end` (layout uses `end`). */
  semanticEndMinutes?: number;
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
  const { layoutExclusiveEnd, start, end, ...rest } = item;
  const zone = baseDate.timeZone;
  const startZoned = timelineTemporalToZoned(start, zone);
  const { layoutEndZoned, semanticEndZoned } = resolveLayoutAndSemanticEnd(
    end,
    layoutExclusiveEnd,
    zone,
  );
  return {
    ...rest,
    start: zonedDateTimeToMinutes(startZoned, baseDate),
    end: zonedDateTimeToMinutes(layoutEndZoned, baseDate),
    semanticEndMinutes:
      semanticEndZoned != null
        ? zonedDateTimeToMinutes(semanticEndZoned, baseDate)
        : undefined,
  };
}

export function toExternalItem<Data>(
  item: TimelineItemInternal<Data>,
  baseDate: ZonedDateTime,
): TimelineItem<Data> {
  const { semanticEndMinutes, ...rest } = item;
  const endMinutes = semanticEndMinutes ?? item.end;
  return {
    ...rest,
    start: minutesToZonedDateTime(item.start, baseDate),
    end: minutesToZonedDateTime(endMinutes, baseDate),
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

const drawPreviewDayOnly: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
};

const drawPreviewDateHour: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

const drawPreviewDateTime: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

/** Time range for customizing the in-lane draw preview (“ghost”) label. Lane row is passed separately. */
export type DrawingPreviewLabelParams = {
  previewStartMinutes: number;
  previewEndMinutes: number;
  baseDate: ZonedDateTime;
  snapOption: SnapOption;
};

/**
 * Label for in-progress lane draw: range follows snap semantics.
 * `1day` → calendar dates only; hour / finer snaps → date + time (hour snap omits sub-hour noise via grid).
 */
export function formatDrawPreviewRange(
  startMinutes: number,
  endMinutes: number,
  baseDate: ZonedDateTime,
  snapOption: SnapOption,
): string {
  const a = Math.min(startMinutes, endMinutes);
  const b = Math.max(startMinutes, endMinutes);

  const fmtDay = (z: ZonedDateTime) =>
    z.toDate().toLocaleDateString("en-US", drawPreviewDayOnly);

  if (snapOption === "1day") {
    const zStart = minutesToZonedDateTime(a, baseDate);
    if (b <= a) {
      return fmtDay(zStart);
    }
    const zEndInclusive = minutesToZonedDateTime(b - 1, baseDate);
    const s = fmtDay(zStart);
    const e = fmtDay(zEndInclusive);
    return s === e ? s : `${s} → ${e}`;
  }

  const opts: Intl.DateTimeFormatOptions =
    snapOption === "1hour" ? drawPreviewDateHour : drawPreviewDateTime;

  const zA = minutesToZonedDateTime(a, baseDate);
  const zB = minutesToZonedDateTime(b, baseDate);
  if (b <= a) {
    return zA.toDate().toLocaleString("en-US", opts);
  }
  const sa = zA.toDate().toLocaleString("en-US", opts);
  const sb = zB.toDate().toLocaleString("en-US", opts);
  return sa === sb ? sa : `${sa} → ${sb}`;
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
