import type { ZonedDateTime } from "@internationalized/date";
import {
  alignDayMinutesToWeekStart,
  collectDayMarkerMinutesForRange,
  collectMonthStartMinutesForRange,
  collectQuarterStartMinutesForRange,
  collectYearStartMinutesForRange,
  getZonedDayAfterEndMinutes,
  getZonedDayStartMinutes,
} from "./passionware-timeline-core.ts";
import { pixelsPerMinuteFromZoom } from "./timeline-view-geometry.ts";

export type TimelineTimeScale =
  | "hours"
  | "days"
  | "weeks"
  | "months"
  | "quarters";

export interface TimelineRulerModel {
  timeScale: TimelineTimeScale;
  labelInterval: number;
  showQuarterLabels: boolean;
  hourMarkers: number[];
  quarterMarkers: number[];
  dayMarkers: number[];
  weekMarkers: number[];
  monthMarkers: number[];
  yearMarkers: number[];
  quarterScaleMarkers: number[];
}

export function buildTimelineRulerModel(
  startTime: number,
  endTime: number,
  zoom: number,
  baseDateZoned: ZonedDateTime,
  timeZone: string,
): TimelineRulerModel {
  const pixelsPerMinute = pixelsPerMinuteFromZoom(zoom);
  const hourSpacingPx = 60 * pixelsPerMinute;
  const daySpacingPx = 1440 * pixelsPerMinute;
  const quarterSpacingPx = 15 * pixelsPerMinute;

  const getTimeScale = (): TimelineTimeScale => {
    if (daySpacingPx < 14) return "quarters";
    if (daySpacingPx < 20) return "months";
    if (daySpacingPx < 50) return "weeks";
    if (daySpacingPx < 200) return "days";
    return "hours";
  };

  const timeScale = getTimeScale();

  const getLabelInterval = (): number => {
    if (hourSpacingPx < 20) return 12 * 60;
    if (hourSpacingPx < 30) return 6 * 60;
    if (hourSpacingPx < 80) return 3 * 60;
    return 60;
  };

  const labelInterval = getLabelInterval();
  const showQuarterLabels = quarterSpacingPx >= 55;

  const hourMarkers: number[] = [];
  const quarterMarkers: number[] = [];
  const dayMarkers: number[] = [];
  const weekMarkers: number[] = [];
  const monthMarkers: number[] = [];
  const yearMarkers: number[] = [];
  const quarterScaleMarkers: number[] = [];

  if (timeScale === "hours") {
    const startHour = Math.floor(startTime / 60) * 60;
    const endHour = Math.ceil(endTime / 60) * 60;

    for (let t = startHour; t <= endHour; t += 60) {
      hourMarkers.push(t);
    }

    if (hourSpacingPx >= 30) {
      for (let t = startHour; t <= endHour; t += 15) {
        if (t % 60 !== 0) {
          quarterMarkers.push(t);
        }
      }
    }

    dayMarkers.push(
      ...collectDayMarkerMinutesForRange(startTime, endTime, baseDateZoned),
    );
  } else if (timeScale === "days") {
    dayMarkers.push(
      ...collectDayMarkerMinutesForRange(startTime, endTime, baseDateZoned),
    );

    monthMarkers.push(
      ...collectMonthStartMinutesForRange(
        startTime,
        endTime,
        baseDateZoned,
        timeZone,
      ),
    );
  } else if (timeScale === "weeks") {
    const endLimit = getZonedDayAfterEndMinutes(endTime, baseDateZoned);
    const startDay = getZonedDayStartMinutes(startTime, baseDateZoned);

    const currentWeek = alignDayMinutesToWeekStart(startDay, baseDateZoned);

    for (let w = currentWeek; w <= endLimit; w += 10080) {
      weekMarkers.push(w);
    }

    monthMarkers.push(
      ...collectMonthStartMinutesForRange(
        startTime,
        endTime,
        baseDateZoned,
        timeZone,
      ),
    );
  } else if (timeScale === "quarters") {
    quarterScaleMarkers.push(
      ...collectQuarterStartMinutesForRange(
        startTime,
        endTime,
        baseDateZoned,
        timeZone,
      ),
    );
    yearMarkers.push(
      ...collectYearStartMinutesForRange(
        startTime,
        endTime,
        baseDateZoned,
        timeZone,
      ),
    );
  } else if (timeScale === "months") {
    monthMarkers.push(
      ...collectMonthStartMinutesForRange(
        startTime,
        endTime,
        baseDateZoned,
        timeZone,
      ),
    );
    yearMarkers.push(
      ...collectYearStartMinutesForRange(
        startTime,
        endTime,
        baseDateZoned,
        timeZone,
      ),
    );
  }

  return {
    timeScale,
    labelInterval,
    showQuarterLabels,
    hourMarkers,
    quarterMarkers,
    dayMarkers,
    weekMarkers,
    monthMarkers,
    yearMarkers,
    quarterScaleMarkers,
  };
}
