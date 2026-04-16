"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import {
  formatDate,
  formatMonthDay,
  formatMonthShort,
  formatMonthYear,
  formatQuarter,
  formatTime,
  formatWeek,
  formatYear,
  HEADER_HEIGHT,
  minutesToZonedDateTime,
  RULER_TRACK_OVERFLOW_PX,
  timelineZonedNow,
  zonedDateTimeToMinutes,
} from "./passionware-timeline-core.ts";
import { useTimelineRulerLayout } from "./use-timeline-ruler-layout.ts";
import { useTimelineLaneSidebarWidth } from "./use-timeline-selectors.ts";

/** Centered labels use `-translate-x-1/2`; keep while overlapping track ∪ horizontal margin. */
function centeredRulerLabelVisible(
  anchorX: number,
  tracksWidth: number,
  labelHalfWidthPx: number,
): boolean {
  const m = RULER_TRACK_OVERFLOW_PX;
  return (
    anchorX + labelHalfWidthPx >= -m &&
    anchorX - labelHalfWidthPx <= tracksWidth + m
  );
}

/** Upper row: ~max half-width of longest `text-xs` ruler string (beyond {@link RULER_TRACK_OVERFLOW_PX}). */
const RULER_LABEL_HALF_UPPER = 100;
/** Lower row: times, Qn, short month (`text-xs tabular-nums`). */
const RULER_LABEL_HALF_LOWER = 64;

/** Keep ruler strings on one line (avoid "Mar" + line break + "16"). */
const RULER_LABEL_NOWRAP = "whitespace-nowrap shrink-0";

export const TimelineScrollHeaders = memo(function TimelineScrollHeaders() {
  const laneSidebarWidthPx = useTimelineLaneSidebarWidth();
  const {
    timeToPixel,
    tracksContentWidth,
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
    baseDateZoned,
  } = useTimelineRulerLayout();

  return (
    <>
      <div
        className="absolute top-0 left-0 right-0 h-6 bg-secondary/50 border-b border-border z-20"
        style={{ paddingLeft: laneSidebarWidthPx }}
      >
        <div className="relative h-full min-w-0 w-full overflow-hidden">
          {timeScale === "hours" &&
            dayMarkers.map((minutes) => {
              const x = timeToPixel(minutes) - laneSidebarWidthPx;
              if (
                !centeredRulerLabelVisible(
                  x,
                  tracksContentWidth,
                  RULER_LABEL_HALF_UPPER,
                )
              ) {
                return null;
              }

              return (
                <div
                  key={`day-${minutes}`}
                  className="absolute top-0 h-full flex items-center"
                  style={{ left: x }}
                >
                  <span
                    className={cn(
                      "text-xs font-medium text-foreground -translate-x-1/2",
                      RULER_LABEL_NOWRAP,
                    )}
                  >
                    {formatDate(minutes, baseDateZoned)}
                  </span>
                </div>
              );
            })}
          {(timeScale === "days" || timeScale === "weeks") &&
            monthMarkers.map((minutes) => {
              const x = timeToPixel(minutes) - laneSidebarWidthPx;
              if (
                !centeredRulerLabelVisible(
                  x,
                  tracksContentWidth,
                  RULER_LABEL_HALF_UPPER,
                )
              ) {
                return null;
              }

              return (
                <div
                  key={`month-${minutes}`}
                  className="absolute top-0 h-full flex items-center"
                  style={{ left: x }}
                >
                  <span
                    className={cn(
                      "text-xs font-medium text-foreground -translate-x-1/2",
                      RULER_LABEL_NOWRAP,
                    )}
                  >
                    {formatMonthYear(minutes, baseDateZoned)}
                  </span>
                </div>
              );
            })}
          {(timeScale === "months" || timeScale === "quarters") &&
            yearMarkers.map((minutes) => {
              const x = timeToPixel(minutes) - laneSidebarWidthPx;
              if (
                !centeredRulerLabelVisible(
                  x,
                  tracksContentWidth,
                  RULER_LABEL_HALF_UPPER,
                )
              ) {
                return null;
              }

              return (
                <div
                  key={`year-${minutes}`}
                  className="absolute top-0 h-full flex items-center"
                  style={{ left: x }}
                >
                  <span
                    className={cn(
                      "text-xs font-medium text-foreground -translate-x-1/2",
                      RULER_LABEL_NOWRAP,
                    )}
                  >
                    {formatYear(minutes, baseDateZoned)}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      <div
        className="absolute top-6 left-0 right-0 h-8 bg-card border-b border-border z-20"
        style={{ paddingLeft: laneSidebarWidthPx }}
      >
        <div className="relative h-full min-w-0 w-full overflow-hidden">
          {timeScale === "hours" && (
            <>
              {quarterMarkers.map((minutes) => {
                const x = timeToPixel(minutes) - laneSidebarWidthPx;
                if (
                  !centeredRulerLabelVisible(
                    x,
                    tracksContentWidth,
                    showQuarterLabels
                      ? RULER_LABEL_HALF_LOWER
                      : 4,
                  )
                ) {
                  return null;
                }

                const shouldShowLabel = showQuarterLabels;

                return (
                  <div
                    key={`q-${minutes}`}
                    className="absolute top-0 h-full flex flex-col justify-end pb-1"
                    style={{ left: x }}
                  >
                    {shouldShowLabel && (
                      <span
                        className={cn(
                          "text-xs tabular-nums -translate-x-1/2 text-muted-foreground",
                          RULER_LABEL_NOWRAP,
                        )}
                      >
                        {formatTime(minutes)}
                      </span>
                    )}
                    <div
                      className={cn(
                        "w-px mt-0.5 ml-0",
                        shouldShowLabel ? "h-1 bg-border" : "h-1 bg-border",
                      )}
                    />
                  </div>
                );
              })}

              {hourMarkers.map((minutes) => {
                const x = timeToPixel(minutes) - laneSidebarWidthPx;
                const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;
                const hourOfDay = Math.floor(normalizedMinutes / 60);

                let shouldShowLabel = false;
                if (labelInterval === 60) {
                  shouldShowLabel = true;
                } else if (labelInterval === 3 * 60) {
                  shouldShowLabel = hourOfDay % 3 === 0;
                } else if (labelInterval === 6 * 60) {
                  shouldShowLabel = hourOfDay % 6 === 0;
                } else if (labelInterval === 12 * 60) {
                  shouldShowLabel = hourOfDay % 12 === 0;
                }

                if (
                  !centeredRulerLabelVisible(
                    x,
                    tracksContentWidth,
                    shouldShowLabel ? RULER_LABEL_HALF_LOWER : 4,
                  )
                ) {
                  return null;
                }

                const isMainHour = minutes % 60 === 0;
                const isMajorMarker = minutes % 360 === 0;

                return (
                  <div
                    key={`h-${minutes}`}
                    className="absolute top-0 h-full flex flex-col justify-end pb-1"
                    style={{ left: x }}
                  >
                    {shouldShowLabel && (
                      <span
                        className={cn(
                          "text-xs tabular-nums -translate-x-1/2",
                          RULER_LABEL_NOWRAP,
                          isMainHour
                            ? "text-foreground font-medium"
                            : "text-muted-foreground",
                        )}
                      >
                        {formatTime(minutes)}
                      </span>
                    )}
                    <div
                      className={cn(
                        "w-px mt-0.5 ml-0",
                        isMajorMarker
                          ? "h-2 bg-foreground/50"
                          : shouldShowLabel
                            ? "h-1.5 bg-muted-foreground"
                            : "h-1 bg-border/60",
                      )}
                    />
                  </div>
                );
              })}
            </>
          )}

          {timeScale === "days" &&
            dayMarkers.map((minutes) => {
              const x = timeToPixel(minutes) - laneSidebarWidthPx;
              if (
                !centeredRulerLabelVisible(
                  x,
                  tracksContentWidth,
                  RULER_LABEL_HALF_LOWER,
                )
              ) {
                return null;
              }

              const zAt = minutesToZonedDateTime(minutes, baseDateZoned);
              const isFirstOfMonth = zAt.day === 1;

              return (
                <div
                  key={`day-${minutes}`}
                  className="absolute top-0 h-full flex flex-col justify-end pb-1"
                  style={{ left: x }}
                >
                  <span
                    className={cn(
                      "text-xs tabular-nums -translate-x-1/2",
                      RULER_LABEL_NOWRAP,
                      isFirstOfMonth
                        ? "text-foreground font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {formatMonthDay(minutes, baseDateZoned)}
                  </span>
                  <div
                    className={cn(
                      "w-px mt-0.5 ml-0",
                      isFirstOfMonth
                        ? "h-2 bg-foreground/50"
                        : "h-1 bg-border/60",
                    )}
                  />
                </div>
              );
            })}

          {timeScale === "weeks" &&
            weekMarkers.map((minutes) => {
              const x = timeToPixel(minutes) - laneSidebarWidthPx;
              if (
                !centeredRulerLabelVisible(
                  x,
                  tracksContentWidth,
                  RULER_LABEL_HALF_LOWER,
                )
              ) {
                return null;
              }

              const zAt = minutesToZonedDateTime(minutes, baseDateZoned);
              const isFirstOfMonth = zAt.day <= 7;

              return (
                <div
                  key={`week-${minutes}`}
                  className="absolute top-0 h-full flex flex-col justify-end pb-1"
                  style={{ left: x }}
                >
                  <span
                    className={cn(
                      "text-xs tabular-nums -translate-x-1/2",
                      RULER_LABEL_NOWRAP,
                      isFirstOfMonth
                        ? "text-foreground font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {formatWeek(minutes, baseDateZoned)}
                  </span>
                  <div
                    className={cn(
                      "w-px mt-0.5 ml-0",
                      isFirstOfMonth
                        ? "h-2 bg-foreground/50"
                        : "h-1 bg-border/60",
                    )}
                  />
                </div>
              );
            })}

          {timeScale === "quarters" &&
            quarterScaleMarkers.map((minutes) => {
              const x = timeToPixel(minutes) - laneSidebarWidthPx;
              if (
                !centeredRulerLabelVisible(
                  x,
                  tracksContentWidth,
                  RULER_LABEL_HALF_LOWER,
                )
              ) {
                return null;
              }

              const zAt = minutesToZonedDateTime(minutes, baseDateZoned);
              const isQ1 = zAt.month === 1;

              return (
                <div
                  key={`cal-quarter-${minutes}`}
                  className="absolute top-0 h-full flex flex-col justify-end pb-1"
                  style={{ left: x }}
                >
                  <span
                    className={cn(
                      "text-xs tabular-nums -translate-x-1/2",
                      RULER_LABEL_NOWRAP,
                      isQ1
                        ? "text-foreground font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {formatQuarter(minutes, baseDateZoned)}
                  </span>
                  <div
                    className={cn(
                      "w-px mt-0.5 ml-0",
                      isQ1 ? "h-2 bg-foreground/50" : "h-1 bg-border/60",
                    )}
                  />
                </div>
              );
            })}

          {timeScale === "months" &&
            monthMarkers.map((minutes) => {
              const x = timeToPixel(minutes) - laneSidebarWidthPx;
              if (
                !centeredRulerLabelVisible(
                  x,
                  tracksContentWidth,
                  RULER_LABEL_HALF_LOWER,
                )
              ) {
                return null;
              }

              const zAt = minutesToZonedDateTime(minutes, baseDateZoned);
              const isQuarter = (zAt.month - 1) % 3 === 0;

              return (
                <div
                  key={`month-${minutes}`}
                  className="absolute top-0 h-full flex flex-col justify-end pb-1"
                  style={{ left: x }}
                >
                  <span
                    className={cn(
                      "text-xs tabular-nums -translate-x-1/2",
                      RULER_LABEL_NOWRAP,
                      isQuarter
                        ? "text-foreground font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {formatMonthShort(minutes, baseDateZoned)}
                  </span>
                  <div
                    className={cn(
                      "w-px mt-0.5 ml-0",
                      isQuarter ? "h-2 bg-foreground/50" : "h-1 bg-border/60",
                    )}
                  />
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
});

export const TimelineNowIndicator = memo(function TimelineNowIndicator() {
  const laneSidebarWidthPx = useTimelineLaneSidebarWidth();
  const { timeToPixel, containerWidth, baseDateZoned, timeZone } =
    useTimelineRulerLayout();
  const now = timelineZonedNow(timeZone);
  const nowMinutes = zonedDateTimeToMinutes(now, baseDateZoned);
  const x = timeToPixel(nowMinutes);
  if (x < laneSidebarWidthPx || x > containerWidth) return null;

  return (
    <div
      className="absolute bottom-0 w-px bg-destructive z-30 pointer-events-none"
      style={{ left: x, top: HEADER_HEIGHT + 8 }}
      title="Now"
    >
      <div className="absolute top-0 -translate-x-[calc(50%-0.5px)] size-2.5 bg-destructive rounded-b-full" />
    </div>
  );
});
