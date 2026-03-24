"use client";

import { useRef, type MouseEvent as ReactMouseEvent } from "react";
import { CircleAlert, CircleCheck, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import type { DefaultTimelineItemProps } from "@/platform/passionware-timeline/timeline-default-item.tsx";
import { DefaultTimelineItem } from "@/platform/passionware-timeline/passionware-timeline.tsx";
import { SUB_ROW_HEIGHT } from "@/platform/passionware-timeline/passionware-timeline-core.ts";
import type { ProjectTimelineItemData } from "./projectTimelineModel.ts";

type Props = DefaultTimelineItemProps<ProjectTimelineItemData>;

const STATUS_STRIP_PX = 18;
const MIN_COLORED_TAIL_PX = 8;

function reportCostStatusIcon(
  status: "unpaid" | "partially-paid" | "paid",
  variant: "on-light" | "on-chart",
) {
  const size = variant === "on-light" ? "h-3 w-3" : "h-3 w-3";
  switch (status) {
    case "unpaid":
      return (
        <CircleAlert
          className={cn(
            size,
            variant === "on-light" ? "text-rose-600" : "text-rose-200",
          )}
          aria-hidden
        />
      );
    case "partially-paid":
      return (
        <CircleDashed
          className={cn(
            size,
            variant === "on-light" ? "text-amber-600" : "text-amber-200",
          )}
          aria-hidden
        />
      );
    case "paid":
      return (
        <CircleCheck
          className={cn(
            size,
            variant === "on-light" ? "text-emerald-600" : "text-emerald-200",
          )}
          aria-hidden
        />
      );
  }
}

/**
 * Report bar: full-width iteration color with a narrow translucent white strip on the left
 * (main color shows through) and the status icon; label sits on the solid-colored tail.
 */
export function ProjectTimelineReportBar(props: Props) {
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef(false);

  const d = props.item.data;
  if (d.kind !== "report") {
    return <DefaultTimelineItem {...props} />;
  }

  const {
    item,
    left,
    width,
    isSelected,
    selected = isSelected,
    isMinWidth,
    onMouseDown,
    onMouseEnter,
    onMouseLeave,
    onClick,
    onMouseOver,
    ref,
    ...rest
  } = props;

  const stripWidth =
    width < STATUS_STRIP_PX + MIN_COLORED_TAIL_PX ? 0 : STATUS_STRIP_PX;

  if (stripWidth === 0) {
    return (
      <DefaultTimelineItem
        {...props}
        leadingVisual={reportCostStatusIcon(d.paymentStatus, "on-chart")}
      />
    );
  }

  const handleMouseDown = (e: ReactMouseEvent) => {
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    hasDraggedRef.current = false;
    onMouseDown(e, item, "move");

    const handleMove = () => {
      hasDraggedRef.current = true;
    };

    const handleUp = (upEvent: globalThis.MouseEvent) => {
      if (mouseDownPosRef.current && onClick) {
        const deltaX = Math.abs(upEvent.clientX - mouseDownPosRef.current.x);
        const deltaY = Math.abs(upEvent.clientY - mouseDownPosRef.current.y);
        if (deltaX < 5 && deltaY < 5 && !hasDraggedRef.current) {
          onClick(e, item);
        }
      }
      mouseDownPosRef.current = null;
      hasDraggedRef.current = false;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  return (
    <div
      ref={ref}
      {...rest}
      data-timeline-item
      data-timeline-item-id={item.id}
      className={cn(
        "absolute flex flex-row overflow-hidden rounded transition-shadow cursor-grab group",
        item.color || "bg-primary",
        isSelected &&
          "ring-2 ring-foreground ring-offset-1 ring-offset-background",
        selected &&
          "z-[1] ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md",
        !isSelected && !selected && "hover:ring-1 hover:ring-foreground/50",
        "border",
      )}
      style={{
        left,
        width,
        top: 8 + (item.row || 0) * SUB_ROW_HEIGHT,
        height: SUB_ROW_HEIGHT - 4,
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseOver={onMouseOver}
    >
      <div
        className="absolute left-0 top-0 bottom-0 z-[1] w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-foreground/30 rounded-l transition-opacity"
        onMouseDown={(e) => onMouseDown(e, item, "resize-start")}
      />

      <div
        className="relative z-[1] m-px flex shrink-0 items-center justify-center self-stretch rounded-l-md border-r border-foreground/10 bg-background/90"
        style={{ width: stripWidth }}
      >
        {reportCostStatusIcon(d.paymentStatus, "on-light")}
      </div>

      <div className="relative z-[1] min-h-0 min-w-0 flex-1">
        <div
          className={cn(
            "absolute inset-x-2 inset-y-0 flex min-w-0 max-w-full items-center overflow-hidden",
            isMinWidth && "inset-x-1",
          )}
        >
          <span className="block min-w-0 min-h-0 flex-1 truncate text-left text-xs font-medium text-primary-foreground">
            {item.label}
          </span>
        </div>

        <div
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-foreground/30 rounded-r transition-opacity"
          onMouseDown={(e) => onMouseDown(e, item, "resize-end")}
        />
      </div>
    </div>
  );
}
