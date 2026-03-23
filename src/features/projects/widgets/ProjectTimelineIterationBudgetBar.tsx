"use client";

import { BudgetTargetHistoryChart } from "@/features/_common/budget-target/BudgetTargetHistoryChart.tsx";
import { useBudgetTargetChartData } from "@/features/_common/budget-target/useBudgetTargetChartData.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import { inclusiveCalendarPeriodToEpochRange } from "@/platform/lang/internationalized-date.ts";
import { SUB_ROW_HEIGHT } from "@/platform/passionware-timeline/passionware-timeline-core.ts";
import type { DefaultTimelineItemProps } from "@/platform/passionware-timeline/timeline-default-item.tsx";
import { useTimelineTimeZone } from "@/platform/passionware-timeline/passionware-timeline.tsx";
import { cn } from "@/lib/utils.ts";
import { rd } from "@passionware/monads";
import type { ProjectTimelineItemData } from "./projectTimelineModel.ts";

export function ProjectTimelineIterationBudgetBar(
  props: DefaultTimelineItemProps<ProjectTimelineItemData> &
    Pick<WithFrontServices, "services"> & {
      /** Same-lane charts share this Y domain when set. */
      sharedYDomain?: [number, number] | undefined;
      /**
       * When set, fixes the chart X domain to this epoch-ms span (e.g. full iteration for
       * calendar-aligned scale). Omit for default compact sparkline (first point at the left, no gap).
       */
      chartXViewportMs?: { minMs: number; maxMs: number } | null;
    },
) {
  const d = props.item.data;
  const timelineTimeZone = useTimelineTimeZone();
  const logEntries = props.services.iterationTriggerService.useBudgetTargetLog(
    d.kind === "iteration-budget" ? d.iterationId : null,
  );

  const periodRange =
    d.kind === "iteration-budget"
      ? inclusiveCalendarPeriodToEpochRange(
          d.periodStart,
          d.periodEnd,
          timelineTimeZone,
        )
      : undefined;

  const chartResultRd = useBudgetTargetChartData({
    logEntries,
    iterationCurrency: d.kind === "iteration-budget" ? d.currency : "",
    periodRange,
    yDomain: props.sharedYDomain,
  });

  if (d.kind !== "iteration-budget" || periodRange === undefined) {
    return null;
  }
  const chartReady = rd.tryGet(chartResultRd);
  if (chartReady == null || chartReady.isEmpty) {
    return null;
  }

  const trackH = props.laneTrackHeightPx ?? SUB_ROW_HEIGHT + 8;
  const row = props.item.row ?? 0;
  const top = 8 + row * SUB_ROW_HEIGHT;
  const barHeight = Math.max(72, trackH - top - 8);

  return (
    <div
      data-timeline-item
      className={cn(
        "absolute cursor-pointer overflow-hidden bg-transparent",
        props.isSelected &&
          "ring-2 ring-foreground ring-offset-1 ring-offset-background",
        props.selected &&
          "z-[1] ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
      style={{
        left: props.left,
        width: props.width,
        top,
        height: barHeight,
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        props.onClick?.(e, props.item);
      }}
    >
      <div className="flex h-full min-h-0 min-w-0 flex-col px-0 py-0">
        <BudgetTargetHistoryChart
          logEntries={logEntries}
          iterationCurrency={d.currency}
          formatService={props.services.formatService}
          periodRange={periodRange}
          variant="compact"
          yDomain={props.sharedYDomain}
          xViewportMinMs={props.chartXViewportMs?.minMs ?? null}
          xViewportMaxMs={props.chartXViewportMs?.maxMs ?? null}
        />
      </div>
    </div>
  );
}
