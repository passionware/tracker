"use client";

import { cn } from "@/lib/utils.ts";
import type { TimelineItem } from "@/platform/passionware-timeline/passionware-timeline-core.ts";
import { SUB_ROW_HEIGHT } from "@/platform/passionware-timeline/passionware-timeline-core.ts";
import { useRef, type MouseEvent as ReactMouseEvent, type Ref } from "react";

/** Outer hit target (px); inner rotated square is slightly smaller. */
const HIT_BOX = 24;
const DIAMOND_PX = 10;

export type TimelineMilestoneVariant = "default" | "billing-unpaid";

/** Iteration (or other) span behind the marker, in the same X coords as `left`. */
export type TimelineMilestoneLaneHighlight = {
  bandLeft: number;
  bandWidth: number;
  trackHeightPx: number;
};

function computeMilestoneExpandedWrap(
  left: number,
  laneHighlight: TimelineMilestoneLaneHighlight | undefined,
  diamondHoverBands: readonly TimelineMilestoneLaneHighlight[],
): { wrapLeft: number; wrapWidth: number; trackHeightPx: number } {
  const diamondHalf = HIT_BOX / 2;
  let wrapLeft = left - diamondHalf;
  let wrapRight = left + diamondHalf;
  let trackHeightPx = 0;
  if (laneHighlight != null) {
    wrapLeft = Math.min(wrapLeft, laneHighlight.bandLeft);
    wrapRight = Math.max(
      wrapRight,
      laneHighlight.bandLeft + laneHighlight.bandWidth,
    );
    trackHeightPx = Math.max(trackHeightPx, laneHighlight.trackHeightPx);
  }
  for (const b of diamondHoverBands) {
    wrapLeft = Math.min(wrapLeft, b.bandLeft);
    wrapRight = Math.max(wrapRight, b.bandLeft + b.bandWidth);
    trackHeightPx = Math.max(trackHeightPx, b.trackHeightPx);
  }
  return {
    wrapLeft,
    wrapWidth: Math.max(wrapRight - wrapLeft, 1),
    trackHeightPx,
  };
}

export type TimelineMilestoneDiamondProps<Data = unknown> = {
  item: TimelineItem<Data>;
  /** Extra semantics for styling (e.g. outstanding client invoice). */
  variant?: TimelineMilestoneVariant;
  /** X position of the milestone instant (timeline content coords); component centers on this. */
  left: number;
  /** Ignored — fixed-size marker; accepted for `renderItem` spread compatibility. */
  width?: number;
  isMinWidth?: boolean;
  /**
   * When set, root expands to include this horizontal band (e.g. iteration period on the billing lane).
   * Band is drawn full `trackHeightPx` behind the diamond; `left` stays the instant position.
   * **Unpaid:** the red band is also a hit target (`z-0`) so you can hover/drag from it, but it stacks
   * **under** other milestones’ diamonds (`z-[2]`).
   */
  laneHighlight?: TimelineMilestoneLaneHighlight;
  /**
   * Green washes (e.g. paid billing iteration, or **all** linked report periods for a cost) shown
   * only while the **diamond** is hovered (`peer`/`peer-hover`; bands stay `pointer-events-none`).
   * Omit or pass `[]` when unused. Do not combine with `laneHighlight`.
   */
  diamondHoverBands?: readonly TimelineMilestoneLaneHighlight[];
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
  laneHighlight,
  diamondHoverBands,
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
  const hoverBands = diamondHoverBands ?? [];
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

  const markerRingClass = cn(
    "flex cursor-grab items-center justify-center rounded-sm transition-shadow",
    isSelected &&
      "ring-2 ring-foreground ring-offset-2 ring-offset-background",
    selected &&
      "z-[3] ring-2 ring-primary ring-offset-2 ring-offset-background",
    !isSelected &&
      !selected &&
      "hover:ring-1 hover:ring-foreground/40",
  );

  const diamondShape = (
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
  );

  const needsExpandedLayout =
    laneHighlight != null || hoverBands.length > 0;
  if (needsExpandedLayout) {
    const { wrapLeft, wrapWidth, trackHeightPx } =
      computeMilestoneExpandedWrap(left, laneHighlight, hoverBands);
    const showUnpaidRed = laneHighlight != null;
    const showDiamondHoverGreen = hoverBands.length > 0;

    const unpaidRedStyle =
      laneHighlight != null
        ? ({
            left: laneHighlight.bandLeft - wrapLeft,
            top: 0,
            width: laneHighlight.bandWidth,
            height: trackHeightPx,
          } as const)
        : null;

    const diamondHostStyle = {
      left: left - wrapLeft,
      top,
      width: HIT_BOX,
      height: HIT_BOX,
      transform: "translateX(-50%)" as const,
    };

    return (
      <div
        className="pointer-events-none absolute"
        style={{
          left: wrapLeft,
          top: 0,
          width: wrapWidth,
          height: trackHeightPx,
        }}
      >
        {showUnpaidRed && unpaidRedStyle != null && (
          <div
            className="pointer-events-auto absolute z-0 cursor-grab bg-destructive/15 dark:bg-destructive/22"
            style={unpaidRedStyle}
            data-timeline-item
            data-timeline-item-id={item.id}
            data-billing-unpaid=""
            aria-hidden
            onMouseDown={handleMouseDown}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onMouseOver={onMouseOver}
          />
        )}
        <div
          ref={ref}
          {...rest}
          data-timeline-item
          data-timeline-item-id={item.id}
          data-billing-unpaid={unpaidBilling ? "" : undefined}
          aria-label={item.label}
          className={cn(
            "pointer-events-auto absolute z-[2] cursor-grab",
            markerRingClass,
            showDiamondHoverGreen && "peer",
          )}
          style={diamondHostStyle}
          onMouseDown={handleMouseDown}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onMouseOver={onMouseOver}
        >
          {diamondShape}
        </div>
        {showDiamondHoverGreen &&
          hoverBands.map((band, i) => (
            <div
              key={i}
              className="pointer-events-none absolute z-[1] bg-emerald-600/22 opacity-0 transition-opacity duration-150 peer-hover:opacity-100 dark:bg-emerald-500/26"
              style={{
                left: band.bandLeft - wrapLeft,
                top: 0,
                width: band.bandWidth,
                height: trackHeightPx,
              }}
              aria-hidden
            />
          ))}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      {...rest}
      data-timeline-item
      data-timeline-item-id={item.id}
      data-billing-unpaid={unpaidBilling ? "" : undefined}
      aria-label={item.label}
      className={cn("absolute z-[2]", markerRingClass)}
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
      {diamondShape}
    </div>
  );
}
