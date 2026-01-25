/**
 * Cube Time Subrange Control Component
 *
 * Provides date range selector for filtering cube data by time.
 * Allows users to restrict the analysis to a specific time period.
 */

import { useCubeContext } from "@/features/_common/Cube/CubeContext.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { DateFilterWidget } from "@/features/_common/elements/filters/DateFilterWidget.tsx";
import { DateFilter } from "@/api/_common/query/filters/DateFilter.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { maybe, Maybe } from "@passionware/monads";
import { useMemo } from "react";

interface CubeTimeSubrangeControlProps
  extends WithServices<[WithFormatService]> {
  title?: string;
}

export function CubeTimeSubrangeControl({
  title = "Time Range",
  services,
}: CubeTimeSubrangeControlProps) {
  const { state } = useCubeContext();

  // Get the time subrange from state
  const timeSubrange = state.timeSubrange;

  // Convert timeSubrange to DateFilter format
  const dateFilter: Maybe<DateFilter> = useMemo(() => {
    if (!timeSubrange) {
      return maybe.ofAbsent();
    }

    const startDate = new Date(timeSubrange.start);
    const endDate = new Date(timeSubrange.end);

    return maybe.of({
      operator: "between",
      value: {
        from: startDate,
        to: endDate,
      },
    } as DateFilter);
  }, [timeSubrange]);

  // Calculate available date range from data (for highlighting and disabling)
  const availableDateRange = useMemo<
    { from: Date; to: Date } | undefined
  >(() => {
    const data = state.cube.config.data;
    if (!data || data.length === 0) {
      return undefined;
    }

    // Collect all dates from startAt and endAt fields
    const dates: Date[] = [];
    data.forEach((item) => {
      const startAt = item.startAt || item.start_at;
      const endAt = item.endAt || item.end_at;

      if (startAt) {
        const date = new Date(startAt);
        if (!isNaN(date.getTime())) {
          dates.push(date);
        }
      }
      if (endAt) {
        const date = new Date(endAt);
        if (!isNaN(date.getTime())) {
          dates.push(date);
        }
      }
    });

    if (dates.length === 0) {
      return undefined;
    }

    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Set to start/end of day for proper date comparison
    minDate.setHours(0, 0, 0, 0);
    maxDate.setHours(23, 59, 59, 999);

    return {
      from: minDate,
      to: maxDate,
    };
  }, [state.cube.config.data]);

  const handleDateFilterUpdate = (filter: Maybe<DateFilter>) => {
    if (maybe.isAbsent(filter)) {
      // Clear the time subrange
      state.setTimeSubrange(null);
      return;
    }

    // Only handle "between" operator for range selection
    if (filter.operator !== "between") {
      // Convert other operators to a range if needed
      // For now, we'll only support "between" for time subrange
      return;
    }

    const startDate = new Date(filter.value.from);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(filter.value.to);
    endDate.setHours(23, 59, 59, 999);

    state.setTimeSubrange({
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-700">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">
            Filter by time range
          </label>
          <div className="[&_.toolbar-button]:w-full">
            <DateFilterWidget
              services={services}
              value={dateFilter}
              fieldLabel="All time"
              onUpdate={handleDateFilterUpdate}
              rangeOnly={true}
              disabledDates={
                availableDateRange
                  ? [
                      { before: availableDateRange.from },
                      { after: availableDateRange.to },
                    ]
                  : undefined
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
