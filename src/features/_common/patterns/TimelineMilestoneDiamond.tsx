"use client";

import { cn } from "@/lib/utils.ts";
import type { TimelineItem } from "@/platform/passionware-timeline/passionware-timeline-core.ts";
import { SUB_ROW_HEIGHT } from "@/platform/passionware-timeline/passionware-timeline-core.ts";
import { useRef, type MouseEvent as ReactMouseEvent, type Ref } from "react";

/** Outer hit target (px); inner rotated square is slightly smaller. */
const HIT_BOX = 24;
const DIAMOND_PX = 10;

export type TimelineMilestoneVariant = "default" | "billing-unpaid";

export type TimelineMilestoneDiamondProps<Data = unknown> = {
  item: TimelineItem<Data>;
  /** Extra semantics for styling (e.g. outstanding client invoice). */
  variant?: TimelineMilestoneVariant;
  /** X position of the milestone instant (timeline content coords); component centers on this. */
  left: number;
  /** Ignored — fixed-size marker; accepted for `renderItem` spread compatibility. */
  width?: number;
  isMinWidth?: boolean;
  isSelected: boolean;
  selected: boolean;
  /** @deprecated Hover ring uses CSS `:hover`; kept for Storybook / spread compatibility. */
  isHovered?: boolean;
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
};

/**
 * Point-in-time marker for timelines: fixed screen size, centered on `left`, independent of zoom.
 */
export function TimelineMilestoneDiamond<Data = unknown>({
  item,
  variant = "default",
  left,
  width: _width,
  isMinWidth: _isMinWidth,
  isSelected,
  selected = isSelected,
  isHovered: _legacyIsHovered,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onMouseOver,
  ref,
  ...rest
}: TimelineMilestoneDiamondProps<Data>) {
    void _width;
    void _isMinWidth;
    void _legacyIsHovered;
    const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
    const hasDraggedRef = useRef(false);

    const rowTop = 8 + (item.row ?? 0) * SUB_ROW_HEIGHT;
    const rowInnerH = SUB_ROW_HEIGHT - 4;
    const top = rowTop + (rowInnerH - HIT_BOX) / 2;

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

    const unpaidBilling = variant === "billing-unpaid";

    return (
      <div
        ref={ref}
        {...rest}
        data-timeline-item
        data-billing-unpaid={unpaidBilling ? "" : undefined}
        aria-label={item.label}
        className={cn(
          "absolute z-[2] flex cursor-grab items-center justify-center rounded-sm transition-shadow",
          isSelected &&
            "ring-2 ring-foreground ring-offset-2 ring-offset-background",
          selected &&
            "z-[3] ring-2 ring-primary ring-offset-2 ring-offset-background",
          !isSelected &&
            !selected &&
            "hover:ring-1 hover:ring-foreground/40",
        )}
        style={{
          left,
          top,
          width: HIT_BOX,
          height: HIT_BOX,
          transform: "translateX(-50%)",
        }}
        onMouseDown={handleMouseDown}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onMouseOver={onMouseOver}
      >
        <div
          className={cn(
            "shrink-0 rounded-[2px] shadow-md",
            unpaidBilling
              ? cn(
                  "border-2 border-dashed border-amber-600/90 ring-1 ring-amber-500/40 dark:border-amber-400 dark:ring-amber-400/30",
                  item.color || "bg-primary",
                )
              : cn("border-2 border-background", item.color || "bg-primary"),
          )}
          style={{
            width: DIAMOND_PX,
            height: DIAMOND_PX,
            transform: "rotate(45deg)",
          }}
          aria-hidden
        />
        {unpaidBilling && (
          <span
            className="pointer-events-none absolute -right-0.5 -top-0.5 size-2 rounded-full bg-amber-500 shadow-sm ring-2 ring-background"
            aria-hidden
          />
        )}
      </div>
    );
}
