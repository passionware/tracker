"use client";

// Modern, locale-aware calendar primitives built on react-aria-components.
// Use inside a `<Calendar>` or `<RangeCalendar>` to get the consistent
// Tracker theme look (date-picker, DateFilterWidget, dashboard ranges).

import { cn } from "@/lib/utils";
import { CalendarDate } from "@internationalized/date";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import {
  Button as AriaButton,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Heading,
} from "react-aria-components";

export interface AriaCellRenderProps {
  date: CalendarDate;
  isSelected: boolean;
  isSelectionStart: boolean;
  isSelectionEnd: boolean;
  isOutsideMonth: boolean;
  isDisabled: boolean;
  isUnavailable: boolean;
  isFocusVisible: boolean;
  isHovered: boolean;
  isPressed: boolean;
  isToday: boolean;
}

export interface AriaCalendarVariantOptions {
  /** Larger touch targets — use on mobile / inside drawers. */
  large?: boolean;
  /** Render range-style selection (continuous bar, square middles). */
  isRange?: boolean;
}

// eslint-disable-next-line react-refresh/only-export-components
export function getAriaCellClassName(
  s: AriaCellRenderProps,
  opts: AriaCalendarVariantOptions = {},
): string {
  const { large = false, isRange = false } = opts;
  const isOnlyDay = s.isSelectionStart && s.isSelectionEnd;
  const isMiddle =
    isRange && s.isSelected && !s.isSelectionStart && !s.isSelectionEnd;

  return cn(
    "relative flex cursor-pointer items-center justify-center text-sm font-normal tabular-nums outline-none transition-colors",
    large ? "size-11" : "size-9",
    // Corners
    isRange
      ? cn(
          "rounded-none",
          s.isSelectionStart && "rounded-l-md",
          s.isSelectionEnd && "rounded-r-md",
          isOnlyDay && "rounded-md",
        )
      : "rounded-md",
    // Default text
    !s.isSelected && !s.isDisabled && !s.isUnavailable && "text-foreground",
    // Hover
    s.isHovered &&
      !s.isSelected &&
      !s.isDisabled &&
      "bg-accent text-accent-foreground",
    // Pressed
    s.isPressed && !s.isSelected && "bg-accent/80",
    // Range middle: subtle band, not the primary fill
    isMiddle && "bg-primary/15 text-foreground",
    // Selected single day OR range endpoints: primary pill
    s.isSelected &&
      (!isRange || s.isSelectionStart || s.isSelectionEnd) &&
      "bg-primary font-medium text-primary-foreground hover:bg-primary",
    // Outside current month
    s.isOutsideMonth && "text-muted-foreground/30 hover:bg-transparent",
    // Disabled / unavailable
    (s.isDisabled || s.isUnavailable) &&
      "cursor-not-allowed text-muted-foreground/40 line-through hover:bg-transparent",
    // Keyboard focus ring above range bar
    s.isFocusVisible &&
      "z-10 ring-2 ring-ring ring-offset-2 ring-offset-background",
    // Today indicator (dot under day number)
    s.isToday && [
      "after:pointer-events-none after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full",
      s.isSelected ? "after:bg-primary-foreground" : "after:bg-primary",
    ],
  );
}

/**
 * Header with month/year heading and prev/next buttons. Must be rendered
 * inside a `<Calendar>` or `<RangeCalendar>`.
 */
export function AriaCalendarHeader({
  large = false,
  className,
}: {
  large?: boolean;
  className?: string;
} = {}) {
  const navButtonSize = large ? "h-9 w-9" : "h-8 w-8";
  return (
    <header
      className={cn("flex items-center justify-between pb-2", className)}
    >
      <AriaButton
        slot="previous"
        aria-label="Previous month"
        className={cn(
          "flex items-center justify-center rounded-md text-muted-foreground transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40",
          navButtonSize,
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </AriaButton>
      <Heading className="px-2 text-sm font-medium capitalize" />
      <AriaButton
        slot="next"
        aria-label="Next month"
        className={cn(
          "flex items-center justify-center rounded-md text-muted-foreground transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40",
          navButtonSize,
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </AriaButton>
    </header>
  );
}

/**
 * Renders one month grid. Pass `offset={{ months: n }}` to display additional
 * months side-by-side inside the same Calendar/RangeCalendar.
 */
export function AriaCalendarBody({
  large = false,
  isRange = false,
  offset,
  className,
}: AriaCalendarVariantOptions & {
  offset?: { months: number };
  className?: string;
} = {}) {
  return (
    <CalendarGrid
      offset={offset}
      className={cn("border-collapse", className)}
    >
      <CalendarGridHeader>
        {(day) => (
          <CalendarHeaderCell
            className={cn(
              "text-center text-[0.7rem] font-normal uppercase tracking-wide text-muted-foreground",
              large ? "h-9 w-11" : "h-8 w-9",
            )}
          >
            {day}
          </CalendarHeaderCell>
        )}
      </CalendarGridHeader>
      <CalendarGridBody>
        {(date) => (
          <CalendarCell
            date={date}
            className={(s) => getAriaCellClassName(s, { large, isRange })}
          />
        )}
      </CalendarGridBody>
    </CalendarGrid>
  );
}

/**
 * Standard footer with optional Clear / Today shortcuts. Used by single
 * date pickers; range pickers usually render their own preset rail.
 */
export function AriaCalendarFooter({
  onClear,
  onToday,
  start,
  end,
}: {
  onClear?: () => void;
  onToday?: () => void;
  start?: React.ReactNode;
  end?: React.ReactNode;
}) {
  if (!onClear && !onToday && !start && !end) return null;
  const baseBtn = cn(
    "rounded-md px-2 py-1 text-xs font-medium transition-colors",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  );
  return (
    <footer className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
      <div className="flex items-center gap-1">
        {start}
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className={cn(
              baseBtn,
              "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        {end}
        {onToday && (
          <button
            type="button"
            onClick={onToday}
            className={cn(
              baseBtn,
              "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            )}
          >
            Today
          </button>
        )}
      </div>
    </footer>
  );
}
