/**
 * Cube Timeline View Component
 *
 * Displays a timeline visualization of cube data using startAt and endAt fields.
 * Groups events by the current breakdown dimension (each group becomes a row/axis).
 */

import { useMemo, useRef, useEffect } from "react";
import { TimelineCanvas, useTimeline } from "@gravity-ui/timeline/react";
import { AbstractEventRenderer } from "@gravity-ui/timeline";
import {
  useCubeContext,
  useCurrentBreakdownDimensionId,
} from "@/features/_common/Cube/CubeContext.tsx";
import { cn } from "@/lib/utils";

interface CubeTimelineViewProps {
  className?: string;
}

// Custom event renderer that displays labels
class LabeledEventRenderer extends AbstractEventRenderer {
  hitboxResult = { left: 0, right: 0, top: 0, bottom: 0 };

  render(
    ctx: CanvasRenderingContext2D,
    event: any,
    isSelected: boolean,
    x0: number,
    x1: number,
    y: number,
    h: number,
    viewConfiguration: any,
  ) {
    const width = x1 - x0;
    const minWidthForLabel = 40; // Minimum width to show label

    // Determine colors
    let color = event.color || "#3b82f6";
    if (isSelected) {
      color = event.selectedColor || "#1d4ed8";
    }

    // Draw event rectangle (use half height for visual appearance)
    const eventHeight = h / 2;
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.roundRect(x0, y - eventHeight / 2, width, eventHeight, 2);
    ctx.fill();

    // Draw label if event is wide enough and has a label
    if (width >= minWidthForLabel && event.label) {
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.font = viewConfiguration?.events?.font || "11px Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      // Truncate label if too long
      const maxChars = Math.floor(width / 6); // Approximate chars per pixel
      let label = event.label;
      if (label.length > maxChars) {
        label = label.substring(0, maxChars - 3) + "...";
      }

      // Add text shadow for better readability
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      const padding = 10; // Padding from left edge
      ctx.fillText(label, x0 + padding, y);
      ctx.restore();
    }
  }

  getHitbox(_event: any, x0: number, x1: number) {
    this.hitboxResult.left = x0;
    this.hitboxResult.right = x1;
    // top and bottom are set by the base class or timeline library
    // We keep them at 0 as defaults since getHitbox doesn't receive y/h parameters
    return this.hitboxResult;
  }
}

export function CubeTimelineView({ className = "" }: CubeTimelineViewProps) {
  const { state } = useCubeContext();
  const breakdownDimensionId = useCurrentBreakdownDimensionId();
  const dimensions = state.cube.config.dimensions;
  const cube = state.cube;

  // Timeline header height - accounts for the time scale header at the top
  const TIMELINE_HEADER_HEIGHT = 40;

  // Get current zoom level data - use filteredData which respects time subrange
  const currentItems = cube.filteredData;

  // Find the breakdown dimension descriptor
  const breakdownDimension = breakdownDimensionId
    ? dimensions.find((d) => d.id === breakdownDimensionId)
    : null;

  // Group items by breakdown dimension
  const groupedData = useMemo(() => {
    if (!breakdownDimension || currentItems.length === 0) {
      // If no breakdown dimension, show all items in a single group
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
          // Only treat as date for ISO-like strings (avoid numeric IDs)
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
        // Skip items with invalid values
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

  // Helper function to create meaningful event labels
  const createEventLabel = useMemo(() => {
    return (item: any): string => {
      const labelParts: string[] = [];

      // Try to get formatted values from dimensions
      const taskDimension = dimensions.find((d) => d.id === "task");
      const activityDimension = dimensions.find((d) => d.id === "activity");
      const projectDimension = dimensions.find((d) => d.id === "project");
      const contractorDimension = dimensions.find((d) => d.id === "contractor");

      // Add task name if available
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
          // Ignore errors
        }
      }

      // Add activity name if available
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
          // Ignore errors
        }
      }

      // Add project name if available (and not already shown via breakdown)
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
          // Ignore errors
        }
      }

      // Add contractor name if available (and not already shown via breakdown)
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
          // Ignore errors
        }
      }

      // Add duration if available
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
        // Calculate duration from startAt/endAt
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
          // Ignore errors
        }
      }

      // Add note if available and short
      if (item.note && typeof item.note === "string" && item.note.length < 30) {
        labelParts.push(item.note);
      }

      // Fallback to generic labels
      if (labelParts.length === 0) {
        if (item.label) {
          labelParts.push(item.label);
        } else if (item.name) {
          labelParts.push(item.name);
        } else if (item.id) {
          labelParts.push(`Entry ${item.id.slice(0, 8)}`);
        } else {
          labelParts.push("Time Entry");
        }
      }

      return labelParts.join(" • ");
    };
  }, [dimensions, breakdownDimension]);

  // Extract timeline events from items
  const timelineData = useMemo(() => {
    const axes: Array<{
      id: string;
      tracksCount: number;
      top: number;
      height: number;
    }> = [];
    const events: Array<{
      id: string;
      from: number;
      to?: number;
      axisId: string;
      trackIndex: number;
      label?: string;
      color?: string;
      selectedColor?: string;
      renderer?: AbstractEventRenderer;
    }> = [];

    const axisHeight = 40; // Fixed height per axis (reduced from 60px)
    let currentTop = 0;

    groupedData.groups.forEach((group, groupIndex) => {
      const axisId = `axis-${groupIndex}`;
      const tracksCount = 1; // One track per group for now

      axes.push({
        id: axisId,
        tracksCount,
        top: currentTop,
        height: axisHeight,
      });

      group.items.forEach((item, itemIndex) => {
        const startAt = item.startAt || item.start_at;
        const endAt = item.endAt || item.end_at;

        if (!startAt) {
          return; // Skip items without startAt
        }

        const startTimestamp = new Date(startAt).getTime();
        if (isNaN(startTimestamp)) {
          return; // Skip invalid dates
        }

        const endTimestamp = endAt ? new Date(endAt).getTime() : null;
        if (endAt && isNaN(endTimestamp!)) {
          return; // Skip invalid end dates
        }

        // If no endAt, create a point event (1 hour duration for visibility)
        const from = startTimestamp;
        const to = endTimestamp || startTimestamp + 3600000; // 1 hour default

        events.push({
          id: `event-${groupIndex}-${itemIndex}`,
          from,
          to,
          axisId,
          trackIndex: 0,
          label: createEventLabel(item),
          color: "#3b82f6", // Default blue color
          selectedColor: "#1d4ed8", // Darker blue when selected
          renderer: new LabeledEventRenderer(),
        });
      });

      currentTop += axisHeight + 4; // Add spacing between axes (reduced from 10px)
    });

    return { axes, events };
  }, [groupedData, createEventLabel]);

  // Calculate timeline bounds from all events
  const timelineBounds = useMemo(() => {
    if (timelineData.events.length === 0) {
      const now = Date.now();
      return {
        start: now - 86400000, // 1 day ago
        end: now + 86400000, // 1 day from now
      };
    }

    const timestamps = timelineData.events.flatMap((event) => [
      event.from,
      event.to || event.from,
    ]);

    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);

    // Add padding (10% on each side)
    const padding = (maxTime - minTime) * 0.1 || 86400000; // Default 1 day padding

    return {
      start: minTime - padding,
      end: maxTime + padding,
    };
  }, [timelineData.events]);

  const { timeline, start, stop } = useTimeline({
    settings: {
      start: timelineBounds.start,
      end: timelineBounds.end,
      axes: timelineData.axes,
      events: timelineData.events,
      markers: [],
      sections: [],
    },
    viewConfiguration: {
      events: {
        font: "11px Arial",
        hitboxPadding: 4,
      },
    },
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const timelineStartedRef = useRef(false);

  // Sync vertical scrolling between labels and timeline
  useEffect(() => {
    const labelsContainer = labelsRef.current;
    const canvasContainer = canvasWrapperRef.current;

    if (!labelsContainer || !canvasContainer) return;

    let isSyncing = false;

    const handleLabelsScroll = () => {
      if (!isSyncing) {
        isSyncing = true;
        canvasContainer.scrollTop = labelsContainer.scrollTop;
        requestAnimationFrame(() => {
          isSyncing = false;
        });
      }
    };

    const handleCanvasScroll = () => {
      if (!isSyncing) {
        isSyncing = true;
        labelsContainer.scrollTop = canvasContainer.scrollTop;
        requestAnimationFrame(() => {
          isSyncing = false;
        });
      }
    };

    // Prevent horizontal scrolling on canvas container to allow timeline pan/zoom
    const handleCanvasWheel = (e: WheelEvent) => {
      // Allow vertical scrolling
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        return; // Let default vertical scroll happen
      }
      // Prevent horizontal scrolling - let timeline handle it
      e.preventDefault();
    };

    labelsContainer.addEventListener("scroll", handleLabelsScroll, {
      passive: true,
    });
    canvasContainer.addEventListener("scroll", handleCanvasScroll, {
      passive: true,
    });
    canvasContainer.addEventListener("wheel", handleCanvasWheel, {
      passive: false,
    });

    return () => {
      labelsContainer.removeEventListener("scroll", handleLabelsScroll);
      canvasContainer.removeEventListener("scroll", handleCanvasScroll);
      canvasContainer.removeEventListener("wheel", handleCanvasWheel);
    };
  }, []);

  useEffect(() => {
    // Reset the started flag when timeline changes
    timelineStartedRef.current = false;

    if (containerRef.current && timeline) {
      const canvas = containerRef.current.querySelector("canvas");
      if (canvas instanceof HTMLCanvasElement) {
        try {
          start(canvas);
          timelineStartedRef.current = true;
        } catch (error) {
          console.warn("Failed to start timeline:", error);
          timelineStartedRef.current = false;
        }
      }
    }

    return () => {
      if (timelineStartedRef.current) {
        try {
          stop();
        } catch (error) {
          // Ignore errors during cleanup - timeline may already be destroyed
          console.warn("Error stopping timeline during cleanup:", error);
        } finally {
          timelineStartedRef.current = false;
        }
      }
    };
  }, [timeline, start, stop]);

  if (currentItems.length === 0) {
    return (
      <div className={cn("p-4", className)}>
        <div className="text-sm text-slate-500 text-center py-8">
          No data available for timeline visualization
        </div>
      </div>
    );
  }

  if (timelineData.events.length === 0) {
    return (
      <div className={cn("p-4", className)}>
        <div className="text-sm text-slate-500 text-center py-8">
          No items with startAt/endAt fields found
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-4", className)}>
      {breakdownDimension && (
        <div className="text-xs text-slate-500 mb-2 flex-shrink-0">
          Grouped by {breakdownDimension.name}
        </div>
      )}
      <div className="w-full h-[28rem] border border-slate-200 rounded-md overflow-hidden flex">
        {/* Sticky Labels Column */}
        <div
          ref={labelsRef}
          className="w-48 border-r border-slate-200 bg-slate-50 flex-shrink-0 overflow-y-auto"
        >
          {/* Header spacer to match timeline header */}
          <div style={{ height: `${TIMELINE_HEADER_HEIGHT}px` }}></div>
          {groupedData.groups.map((group, index) => {
            const axis = timelineData.axes[index];
            if (!axis) return null;
            const spacing = 4; // Match the spacing used in axes
            const isLast = index === groupedData.groups.length - 1;
            return (
              <div
                key={group.key}
                className="px-2 text-xs font-medium text-slate-700 flex items-center"
                style={{
                  height: `${axis.height}px`,
                  marginBottom: isLast ? "0" : `${spacing}px`,
                }}
              >
                <div className="truncate">{group.label}</div>
              </div>
            );
          })}
        </div>

        {/* Timeline Canvas */}
        <div ref={canvasWrapperRef} className="flex-1 overflow-auto">
          <div
            ref={containerRef}
            className="h-full w-full"
            style={{ pointerEvents: "auto" }}
          >
            <TimelineCanvas timeline={timeline} />
          </div>
        </div>
      </div>
    </div>
  );
}
