/**
 * Cube Timeline View Component
 *
 * Displays a timeline visualization of cube data using startAt and endAt fields.
 * Groups events by the current breakdown dimension (each group becomes a lane).
 */

import { useMemo } from "react";
import { fromAbsolute, getLocalTimeZone } from "@internationalized/date";
import {
  InfiniteTimeline,
  type Lane,
  type TimelineItem,
} from "@/platform/passionware-timeline";
import {
  useCubeContext,
  useCurrentBreakdownDimensionId,
} from "@/features/_common/Cube/CubeContext.tsx";
import { cn } from "@/lib/utils";

const LANE_COLORS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
];

interface CubeTimelineViewProps {
  className?: string;
}

export function CubeTimelineView({ className = "" }: CubeTimelineViewProps) {
  const { state } = useCubeContext();
  const breakdownDimensionId = useCurrentBreakdownDimensionId();
  const dimensions = state.cube.config.dimensions;
  const cube = state.cube;

  const currentItems = cube.filteredData;

  const breakdownDimension = breakdownDimensionId
    ? dimensions.find((d) => d.id === breakdownDimensionId)
    : null;

  const groupedData = useMemo(() => {
    if (!breakdownDimension || currentItems.length === 0) {
      return {
        groups: [
          {
            key: "all",
            label: "All Items",
            items: currentItems,
          },
        ],
      };
    }

    const groupsMap = new Map<string, any[]>();

    currentItems.forEach((item) => {
      try {
        const value = breakdownDimension.getValue(item);
        let key: string;

        if (breakdownDimension.getKey) {
          key = breakdownDimension.getKey(value);
        } else if (typeof value === "string") {
          const looksLikeIsoDate = /\d{4}-\d{2}-\d{2}/.test(value);
          if (looksLikeIsoDate) {
            const date = new Date(value);
            key = !isNaN(date.getTime())
              ? date.toISOString().split("T")[0]
              : String(value);
          } else {
            key = String(value);
          }
        } else if (typeof value === "number") {
          key = String(value);
        } else {
          key = String(value ?? "null");
        }

        if (!groupsMap.has(key)) {
          groupsMap.set(key, []);
        }
        groupsMap.get(key)!.push(item);
      } catch {
        // skip
      }
    });

    const groups = Array.from(groupsMap.entries()).map(([key, items]) => {
      const firstValue = breakdownDimension.getValue(items[0]);
      const label = breakdownDimension.formatValue
        ? breakdownDimension.formatValue(firstValue)
        : String(firstValue);
      return {
        key,
        label: `${label} (${items.length})`,
        items,
      };
    });

    return { groups };
  }, [breakdownDimension, currentItems]);

  const createEventLabel = useMemo(() => {
    return (item: any): string => {
      const labelParts: string[] = [];
      const taskDimension = dimensions.find((d) => d.id === "task");
      const activityDimension = dimensions.find((d) => d.id === "activity");
      const projectDimension = dimensions.find((d) => d.id === "project");
      const contractorDimension = dimensions.find((d) => d.id === "contractor");

      if (taskDimension && item.taskId) {
        try {
          const taskValue = taskDimension.getValue(item);
          const taskLabel = taskDimension.formatValue
            ? taskDimension.formatValue(taskValue)
            : String(taskValue);
          if (taskLabel && taskLabel !== "null" && taskLabel !== "undefined") {
            labelParts.push(taskLabel);
          }
        } catch {
          // ignore
        }
      }

      if (activityDimension && item.activityId) {
        try {
          const activityValue = activityDimension.getValue(item);
          const activityLabel = activityDimension.formatValue
            ? activityDimension.formatValue(activityValue)
            : String(activityValue);
          if (
            activityLabel &&
            activityLabel !== "null" &&
            activityLabel !== "undefined"
          ) {
            labelParts.push(activityLabel);
          }
        } catch {
          // ignore
        }
      }

      if (
        projectDimension &&
        item.projectId &&
        breakdownDimension?.id !== "project"
      ) {
        try {
          const projectValue = projectDimension.getValue(item);
          const projectLabel = projectDimension.formatValue
            ? projectDimension.formatValue(projectValue)
            : String(projectValue);
          if (
            projectLabel &&
            projectLabel !== "null" &&
            projectLabel !== "undefined"
          ) {
            labelParts.push(projectLabel);
          }
        } catch {
          // ignore
        }
      }

      if (
        contractorDimension &&
        item.contractorId &&
        breakdownDimension?.id !== "contractor"
      ) {
        try {
          const contractorValue = contractorDimension.getValue(item);
          const contractorLabel = contractorDimension.formatValue
            ? contractorDimension.formatValue(contractorValue)
            : String(contractorValue);
          if (
            contractorLabel &&
            contractorLabel !== "null" &&
            contractorLabel !== "undefined"
          ) {
            labelParts.push(contractorLabel);
          }
        } catch {
          // ignore
        }
      }

      if (item.numHours !== undefined && item.numHours !== null) {
        const hours = Number(item.numHours);
        if (!isNaN(hours) && hours > 0) {
          if (hours < 1) {
            const minutes = Math.round(hours * 60);
            labelParts.push(`${minutes}m`);
          } else {
            labelParts.push(`${hours.toFixed(1)}h`);
          }
        }
      } else if (item.startAt && item.endAt) {
        try {
          const start = new Date(item.startAt || item.start_at);
          const end = new Date(item.endAt || item.end_at);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            if (hours > 0) {
              if (hours < 1) {
                const minutes = Math.round(hours * 60);
                labelParts.push(`${minutes}m`);
              } else {
                labelParts.push(`${hours.toFixed(1)}h`);
              }
            }
          }
        } catch {
          // ignore
        }
      }

      if (item.note && typeof item.note === "string" && item.note.length < 30) {
        labelParts.push(item.note);
      }

      if (labelParts.length === 0) {
        if (item.label) labelParts.push(item.label);
        else if (item.name) labelParts.push(item.name);
        else if (item.id) labelParts.push(`Entry ${item.id.slice(0, 8)}`);
        else labelParts.push("Time Entry");
      }

      return labelParts.join(" • ");
    };
  }, [dimensions, breakdownDimension]);

  const timeZone = getLocalTimeZone();

  const { lanes, items } = useMemo(() => {
    const lanes: Lane[] = groupedData.groups.map((g, i) => ({
      id: g.key,
      name: g.label,
      color: LANE_COLORS[i % LANE_COLORS.length],
    }));

    const items: TimelineItem<any>[] = [];

    groupedData.groups.forEach((group, groupIndex) => {
      const laneId = group.key;
      const color = LANE_COLORS[groupIndex % LANE_COLORS.length];

      group.items.forEach((item, itemIndex) => {
        const startAt = item.startAt || item.start_at;
        const endAt = item.endAt || item.end_at;

        if (!startAt) return;

        const startMs = new Date(startAt).getTime();
        if (isNaN(startMs)) return;

        const endMs = endAt ? new Date(endAt).getTime() : null;
        if (endAt && (endMs === null || isNaN(endMs))) return;

        const to = endMs ?? startMs + 3600000;

        items.push({
          id: `event-${groupIndex}-${itemIndex}`,
          laneId,
          start: fromAbsolute(startMs, timeZone),
          end: fromAbsolute(to, timeZone),
          label: createEventLabel(item),
          color,
          data: item,
        });
      });
    });

    return { lanes, items };
  }, [groupedData, createEventLabel, timeZone]);

  if (currentItems.length === 0) {
    return (
      <div className={cn("p-4", className)}>
        <div className="text-sm text-slate-500 text-center py-8">
          No data available for timeline visualization
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn("p-4", className)}>
        <div className="text-sm text-slate-500 text-center py-8">
          No items with startAt/endAt fields found
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-4 h-full flex flex-col", className)}>
      {breakdownDimension && (
        <div className="text-xs text-slate-500 mb-2 flex-shrink-0">
          Grouped by {breakdownDimension.name}
        </div>
      )}
      <div className="w-full h-full rounded-md overflow-hidden border border-slate-200">
        <InfiniteTimeline items={items} lanes={lanes} />
      </div>
    </div>
  );
}
