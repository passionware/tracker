/**
 * Public timeline model: {@link CalendarDate} (date-only ranges) and {@link ZonedDateTime} (instants).
 * `CalendarDateTime` is used only privately (e.g. default empty-state anchor → {@link toZoned}).
 * JavaScript `Date` appears only at boundaries: {@link ZonedDateTime#toDate} for `Intl`/`DateFormatter`,
 * and epoch math in {@link zonedDateTimeToMinutes} / {@link minutesToZonedDateTime}.
 */
import {
  CalendarDate,
  CalendarDateTime,
  DateFormatter,
  type ZonedDateTime,
  getDayOfWeek,
  fromAbsolute,
  now,
  startOfMonth,
  startOfWeek,
  startOfYear,
  toCalendarDate,
  toZoned,
} from "@internationalized/date";

/**
 * Empty-timeline anchor as **local wall time** (no zone) — only meaningful after
 * {@link toZoned}(…, `timeZone`). Not exported; use {@link defaultTimelineBaseZoned}.
 */
const DEFAULT_BASE_WALL_CLOCK = new CalendarDateTime(2025, 1, 27, 8, 0);

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

/**
 * Converts a public timeline range (same rules as {@link TimelineItem} start/end) into layout
 * minutes relative to `baseDateZoned`, matching {@link toInternalItem} bar geometry.
 */
export function timelineTemporalRangeToLayoutMinutes(
  start: TimelineTemporal,
  end: TimelineTemporal,
  timeZone: string,
  baseDateZoned: ZonedDateTime,
): { startMinutes: number; endMinutes: number } {
  const startZ = timelineTemporalToZoned(start, timeZone);
  const { layoutEndZoned } = resolveLayoutAndSemanticEnd(
    end,
    undefined,
    timeZone,
  );
  return {
    startMinutes: zonedDateTimeToMinutes(startZ, baseDateZoned),
    endMinutes: zonedDateTimeToMinutes(layoutEndZoned, baseDateZoned),
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
  /** When set, drag/draw follow-up ignores other pointers (multi-touch). */
  pointerId?: number;
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
/** Fixed track-label column width (also used for time ↔ pixel math). */
export const SIDEBAR_WIDTH = 256;

/**
 * Horizontal slack for the time axis (track pixel space): extend which ticks are collected and
 * which labels/grid lines render so centered text can stay visible while overlapping this margin
 * past the left/right edges (important when zoomed out — a fixed “minutes” buffer is negligible).
 */
export const RULER_TRACK_OVERFLOW_PX = 200;

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

/** Default timeline origin when there are no items — always a {@link ZonedDateTime} in `timeZone`. */
export function defaultTimelineBaseZoned(timeZone: string): ZonedDateTime {
  return toZoned(DEFAULT_BASE_WALL_CLOCK, timeZone);
}

/** Current instant in `timeZone` (replaces ad-hoc `new Date()` at the timeline boundary). */
export function timelineZonedNow(timeZone: string): ZonedDateTime {
  return now(timeZone);
}

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

/** Civil midnight in `baseDate.timeZone` for the instant at `minutes` (not `floor(m/1440)*1440`). */
export function getZonedDayStartMinutes(
  minutes: number,
  baseDate: ZonedDateTime,
): number {
  return zonedDateTimeToMinutes(
    toZoned(
      toCalendarDate(minutesToZonedDateTime(minutes, baseDate)),
      baseDate.timeZone,
    ),
    baseDate,
  );
}

function calendarDayAfterEndTime(
  endTime: number,
  baseDate: ZonedDateTime,
): CalendarDate {
  return toCalendarDate(minutesToZonedDateTime(endTime, baseDate)).add({
    days: 1,
  });
}

/** Timeline minutes for local midnight on the calendar day after `endTime`'s date. */
export function getZonedDayAfterEndMinutes(
  endTime: number,
  baseDate: ZonedDateTime,
): number {
  const nextDay = calendarDayAfterEndTime(endTime, baseDate);
  return zonedDateTimeToMinutes(
    toZoned(nextDay, baseDate.timeZone),
    baseDate,
  );
}

/** Local midnights from the day of `startTime` through the day after `endTime` (calendar dates). */
export function collectDayMarkerMinutesForRange(
  startTime: number,
  endTime: number,
  baseDate: ZonedDateTime,
): number[] {
  const zone = baseDate.timeZone;
  let cal = toCalendarDate(minutesToZonedDateTime(startTime, baseDate));
  const until = calendarDayAfterEndTime(endTime, baseDate);
  const out: number[] = [];
  for (; cal.compare(until) <= 0; cal = cal.add({ days: 1 })) {
    out.push(zonedDateTimeToMinutes(toZoned(cal, zone), baseDate));
  }
  return out;
}

function calendarQuarterStart(cal: CalendarDate): CalendarDate {
  const m = Math.floor((cal.month - 1) / 3) * 3 + 1;
  return new CalendarDate(cal.year, m, 1);
}

/** Month-start tick minutes in [startTime, endTime] using `timeZone` (matches `minutesToZonedDateTime`). */
export function collectMonthStartMinutesForRange(
  startTime: number,
  endTime: number,
  baseDate: ZonedDateTime,
  timeZone: string,
): number[] {
  const zS = minutesToZonedDateTime(startTime, baseDate);
  const zE = minutesToZonedDateTime(endTime, baseDate);
  let cal = startOfMonth(toCalendarDate(zS));
  const endMonth = startOfMonth(toCalendarDate(zE));
  const out: number[] = [];
  while (cal.compare(endMonth) <= 0) {
    out.push(zonedDateTimeToMinutes(toZoned(cal, timeZone), baseDate));
    cal = cal.add({ months: 1 });
  }
  return out;
}

/** Jan 1 tick minutes for each year intersecting the range, in `timeZone`. */
export function collectYearStartMinutesForRange(
  startTime: number,
  endTime: number,
  baseDate: ZonedDateTime,
  timeZone: string,
): number[] {
  const zS = minutesToZonedDateTime(startTime, baseDate);
  const zE = minutesToZonedDateTime(endTime, baseDate);
  let cal = startOfYear(toCalendarDate(zS));
  const endY = startOfYear(toCalendarDate(zE));
  const out: number[] = [];
  while (cal.compare(endY) <= 0) {
    out.push(zonedDateTimeToMinutes(toZoned(cal, timeZone), baseDate));
    cal = cal.add({ years: 1 });
  }
  return out;
}

/** Quarter-start tick minutes in range, in `timeZone`. */
export function collectQuarterStartMinutesForRange(
  startTime: number,
  endTime: number,
  baseDate: ZonedDateTime,
  timeZone: string,
): number[] {
  const zS = minutesToZonedDateTime(startTime, baseDate);
  const zE = minutesToZonedDateTime(endTime, baseDate);
  let cal = calendarQuarterStart(toCalendarDate(zS));
  const endCal = toCalendarDate(zE);
  const out: number[] = [];
  while (cal.compare(endCal) <= 0) {
    out.push(zonedDateTimeToMinutes(toZoned(cal, timeZone), baseDate));
    cal = cal.add({ months: 3 });
  }
  return out;
}

/** Snap day-grid minute offset to Sunday week start (weekday in `baseDate.timeZone`). */
export function alignDayMinutesToWeekStart(
  startDay: number,
  baseDate: ZonedDateTime,
): number {
  const cal = toCalendarDate(minutesToZonedDateTime(startDay, baseDate));
  const dow = getDayOfWeek(cal, "en-US", "sun");
  return startDay - dow * 1440;
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

const RULER_LOCALE = "en-US";

const rulerFormatters = new Map<string, DateFormatter>();

function rulerDateFormatter(
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): DateFormatter {
  const key = `${timeZone}\0${JSON.stringify(options)}`;
  let f = rulerFormatters.get(key);
  if (!f) {
    f = new DateFormatter(RULER_LOCALE, { ...options, timeZone });
    rulerFormatters.set(key, f);
  }
  return f;
}

/** Ruler string from a `ZonedDateTime` (only bridge to `Date` here for `Intl`). */
function formatZonedDateTimeString(
  z: ZonedDateTime,
  options: Omit<Intl.DateTimeFormatOptions, "timeZone">,
): string {
  return rulerDateFormatter(z.timeZone, options as Intl.DateTimeFormatOptions).format(
    z.toDate(),
  );
}

export function formatDate(minutes: number, baseDate: ZonedDateTime): string {
  const zonedDateTime = minutesToZonedDateTime(minutes, baseDate);
  return formatZonedDateTimeString(zonedDateTime, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Month + day in `baseDate.timeZone` (day-scale lower ruler). */
export function formatMonthDay(minutes: number, baseDate: ZonedDateTime): string {
  const zonedDateTime = minutesToZonedDateTime(minutes, baseDate);
  return formatZonedDateTimeString(zonedDateTime, {
    month: "short",
    day: "numeric",
  });
}

/** Month only in `baseDate.timeZone` (month-scale lower ruler). */
export function formatMonthShort(minutes: number, baseDate: ZonedDateTime): string {
  const zonedDateTime = minutesToZonedDateTime(minutes, baseDate);
  return formatZonedDateTimeString(zonedDateTime, { month: "short" });
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
    formatZonedDateTimeString(z, drawPreviewDayOnly);

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
    return rulerDateFormatter(zA.timeZone, opts).format(zA.toDate());
  }
  const fmtA = rulerDateFormatter(zA.timeZone, opts);
  const fmtB = rulerDateFormatter(zB.timeZone, opts);
  const sa = fmtA.format(zA.toDate());
  const sb = fmtB.format(zB.toDate());
  return sa === sb ? sa : `${sa} → ${sb}`;
}

export function formatMonthYear(minutes: number, baseDate: ZonedDateTime): string {
  const zonedDateTime = minutesToZonedDateTime(minutes, baseDate);
  return formatZonedDateTimeString(zonedDateTime, {
    month: "short",
    year: "numeric",
  });
}

export function formatYear(minutes: number, baseDate: ZonedDateTime): string {
  const zonedDateTime = minutesToZonedDateTime(minutes, baseDate);
  return String(zonedDateTime.year);
}

/** Calendar quarter tick label (year is shown on the upper ruler row). */
export function formatQuarter(minutes: number, baseDate: ZonedDateTime): string {
  const zonedDateTime = minutesToZonedDateTime(minutes, baseDate);
  const q = Math.floor((zonedDateTime.month - 1) / 3) + 1;
  return `Q${q}`;
}

export function formatWeek(minutes: number, baseDate: ZonedDateTime): string {
  const zonedDateTime = minutesToZonedDateTime(minutes, baseDate);
  const cal = toCalendarDate(zonedDateTime);
  const weekStartCal = startOfWeek(cal, "en-US");
  const zWeekStart = toZoned(weekStartCal, zonedDateTime.timeZone);
  return formatZonedDateTimeString(zWeekStart, {
    month: "short",
    day: "numeric",
  });
}
