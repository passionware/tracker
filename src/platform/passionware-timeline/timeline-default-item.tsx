"use client";

import React, {
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
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
  /** Ignored by default item; timeline passes it for custom `renderItem` consumers. */
  laneTrackHeightPx?: number;
  onPointerDown: (
    e: ReactPointerEvent,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    item: TimelineItem<any>,
    type: "move" | "resize-start" | "resize-end",
  ) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: (
    e: ReactMouseEvent | ReactPointerEvent,
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
  laneTrackHeightPx: _laneTrackHeightPx,
  onPointerDown,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onMouseOver,
  ref,
  ...props
}: DefaultTimelineItemProps<any>) {
  // eslint-disable-line @typescript-eslint/no-explicit-any
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef(false);

  const handlePointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    hasDraggedRef.current = false;
    onPointerDown(e, item, "move");

    const handleMove = () => {
      hasDraggedRef.current = true;
    };

    const handleUp = (upEvent: globalThis.PointerEvent) => {
      if (pointerDownPosRef.current && onClick) {
        const deltaX = Math.abs(upEvent.clientX - pointerDownPosRef.current.x);
        const deltaY = Math.abs(upEvent.clientY - pointerDownPosRef.current.y);
        if (deltaX < 5 && deltaY < 5 && !hasDraggedRef.current) {
          onClick(e, item);
        }
      }
      pointerDownPosRef.current = null;
      hasDraggedRef.current = false;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  };

  return (
    <div
      ref={ref}
      {...props}
      data-timeline-item
      data-timeline-item-id={item.id}
      className={cn(
        "absolute rounded transition-shadow cursor-grab group touch-manipulation",
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
      onPointerDown={handlePointerDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseOver={onMouseOver}
    >
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize rounded-l transition-opacity",
          "opacity-0 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-45 [@media(pointer:coarse)]:active:opacity-100",
          "hover:bg-foreground/30",
        )}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          onPointerDown(e, item, "resize-start");
        }}
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
        className={cn(
          "absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize rounded-r transition-opacity",
          "opacity-0 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-45 [@media(pointer:coarse)]:active:opacity-100",
          "hover:bg-foreground/30",
        )}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          onPointerDown(e, item, "resize-end");
        }}
      />
    </div>
  );
}

export const DefaultTimelineItem = React.memo(DefaultTimelineItemInner);
DefaultTimelineItem.displayName = "DefaultTimelineItem";
