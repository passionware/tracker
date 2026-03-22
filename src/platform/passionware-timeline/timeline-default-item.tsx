"use client";

import React, {
  useRef,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/lib/utils";
import { SUB_ROW_HEIGHT } from "./passionware-timeline-core.ts";
import type { TimelineItem } from "./passionware-timeline-core.ts";

export interface DefaultTimelineItemProps<Data = unknown> {
  item: TimelineItem<Data>;
  left: number;
  width: number;
  isSelected: boolean;
  selected: boolean;
  isMinWidth: boolean;
  /** Optional icon or badge before the label (e.g. iteration / sprint marker). */
  leadingVisual?: ReactNode;
  onMouseDown: (
    e: ReactMouseEvent,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    item: TimelineItem<any>,
    type: "move" | "resize-start" | "resize-end",
  ) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: (
    e: ReactMouseEvent,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    item: TimelineItem<any>,
  ) => void;
  onMouseOver?: () => void;
  ref?: Ref<HTMLDivElement>;
}

function DefaultTimelineItemInner({
  item,
  left,
  width,
  isSelected,
  selected = isSelected,
  isMinWidth,
  leadingVisual,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onMouseOver,
  ref,
  ...props
}: DefaultTimelineItemProps<any>) {
  // eslint-disable-line @typescript-eslint/no-explicit-any
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef(false);

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
      {...props}
      data-timeline-item
      className={cn(
        "absolute rounded transition-shadow cursor-grab group",
        item.color || "bg-primary",
        isSelected &&
          "ring-2 ring-foreground ring-offset-1 ring-offset-background",
        selected &&
          "z-[1] ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md",
        !isSelected &&
          !selected &&
          "hover:ring-1 hover:ring-foreground/50",
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
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-foreground/30 rounded-l transition-opacity"
        onMouseDown={(e) => onMouseDown(e, item, "resize-start")}
      />

      <div
        className={cn(
          "absolute inset-x-2 inset-y-0 flex min-w-0 max-w-full items-center gap-1 overflow-hidden",
          isMinWidth && "inset-x-1",
        )}
      >
        {leadingVisual != null ? (
          <span className="flex shrink-0 items-center text-primary-foreground">
            {leadingVisual}
          </span>
        ) : null}
        <span className="block min-w-0 min-h-0 flex-1 truncate text-left text-xs font-medium text-primary-foreground">
          {item.label}
        </span>
      </div>

      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-foreground/30 rounded-r transition-opacity"
        onMouseDown={(e) => onMouseDown(e, item, "resize-end")}
      />
    </div>
  );
}

export const DefaultTimelineItem = React.memo(DefaultTimelineItemInner);
DefaultTimelineItem.displayName = "DefaultTimelineItem";
