"use client";

import { cn } from "@/lib/utils";
import {
  CalendarDate,
  createCalendar,
  getLocalTimeZone,
  isToday,
} from "@internationalized/date";
import { Maybe } from "@passionware/monads";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useButton } from "@react-aria/button";
import {
  useCalendar,
  useCalendarCell,
  useCalendarGrid,
} from "@react-aria/calendar";
import { useDateField, useDateSegment } from "@react-aria/datepicker";
import { useFocusRing } from "@react-aria/focus";
import { useLocale } from "@react-aria/i18n";
import { useCalendarState } from "@react-stately/calendar";
import { useDateFieldState } from "@react-stately/datepicker";
import React, { useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { OpenState } from "@/features/_common/OpenState";

interface DatePickerProps {
  value: Maybe<CalendarDate>;
  onChange: (date: Maybe<CalendarDate>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Custom DateSegment component using React Aria hooks
function DateSegment({
  segment,
  className,
  state,
}: {
  segment: Parameters<typeof useDateSegment>[0];
  className?: string;
  state: ReturnType<typeof useDateFieldState>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { segmentProps } = useDateSegment(segment, state, ref);

  return (
    <div
      {...segmentProps}
      ref={ref}
      className={className}
      style={{
        ...segmentProps.style,
        minWidth:
          segment.maxValue != null
            ? String(segment.maxValue).length + "ch"
            : undefined,
      }}
    >
      {segment.isPlaceholder ? segment.placeholder : segment.text}
    </div>
  );
}

// Custom AriaButton component using React Aria hooks
function AriaButton({
  children,
  className,
  ...props
}: Parameters<typeof useButton>[0] & {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const { buttonProps, isPressed } = useButton(props, ref);
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <button
      {...buttonProps}
      {...focusProps}
      ref={ref}
      type="button"
      className={cn(
        className,
        isPressed && "pressed",
        isFocusVisible && "focus-visible",
      )}
    >
      {children}
    </button>
  );
}

// Custom CalendarCell component using React Aria hooks
function CalendarCell({
  date,
  className,
  state,
}: {
  date: CalendarDate;
  className?: (state: {
    date: CalendarDate;
    isSelected: boolean;
    isOutsideMonth: boolean;
    isDisabled: boolean;
    isFocusVisible: boolean;
  }) => string;
  state: ReturnType<typeof useCalendarState>;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const { cellProps, buttonProps, isSelected, isDisabled, formattedDate } =
    useCalendarCell({ date }, state, ref);

  const isOutsideMonth = state.isCellUnavailable(date);
  const { focusProps, isFocusVisible } = useFocusRing();

  const cellState = {
    date,
    isSelected,
    isOutsideMonth,
    isDisabled,
    isFocusVisible,
  };

  return (
    <div {...cellProps}>
      <button
        {...buttonProps}
        {...focusProps}
        ref={ref}
        type="button"
        className={className?.(cellState)}
      >
        {formattedDate}
      </button>
    </div>
  );
}

// Custom CalendarGrid component
function CalendarGrid({
  children,
  gridProps,
}: {
  children: React.ReactNode;
  gridProps?: React.HTMLAttributes<HTMLElement>;
}) {
  return (
    <div {...gridProps} className="w-full border-collapse space-y-1">
      {children}
    </div>
  );
}

// Custom CalendarGridHeader component
function CalendarGridHeader({
  children,
  headerProps,
  weekDays,
}: {
  children: (day: string) => React.ReactNode;
  headerProps?: React.HTMLAttributes<HTMLElement>;
  weekDays?: string[];
}) {
  const defaultWeekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = weekDays || defaultWeekDays;
  return (
    <div {...headerProps} className="grid grid-cols-7 gap-px">
      {days.map((day) => (
        <React.Fragment key={day}>{children(day)}</React.Fragment>
      ))}
    </div>
  );
}

// Custom CalendarGridBody component
function CalendarGridBody({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-7 gap-0">{children}</div>;
}

// Custom CalendarHeaderCell component
function CalendarHeaderCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

// Date format parsing functions
function parseDateString(dateString: string): CalendarDate | null {
  // Remove any extra whitespace
  const trimmed = dateString.trim();

  // Try different date formats
  const formats = [
    // DD.MM.YYYY
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  ];

  for (const format of formats) {
    const match = trimmed.match(format);
    if (match) {
      const [, day, month, year] = match;
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);

      // Basic validation
      if (
        dayNum >= 1 &&
        dayNum <= 31 &&
        monthNum >= 1 &&
        monthNum <= 12 &&
        yearNum >= 1900 &&
        yearNum <= 2100
      ) {
        try {
          return new CalendarDate(yearNum, monthNum, dayNum);
        } catch {
          // Invalid date, continue to next format
        }
      }
    }
  }

  return null;
}

function formatDateForClipboard(date: CalendarDate): string {
  return `${date.day.toString().padStart(2, "0")}.${date.month.toString().padStart(2, "0")}.${date.year}`;
}

// Sub-component for the date input field
function DateValueInput({
  selected,
  onSingleChange,
  disabled,
  onCopy,
  onPaste,
}: {
  selected?: Maybe<CalendarDate>;
  onSingleChange: (date: CalendarDate) => void;
  disabled?: boolean;
  onCopy: (event: React.ClipboardEvent) => void;
  onPaste: (event: React.ClipboardEvent) => void;
}) {
  const { locale } = useLocale();
  const dateValue = selected || undefined;

  const ref = useRef<HTMLDivElement>(null);

  const fieldState = useDateFieldState({
    value: dateValue,
    onChange: (value) => {
      if (value) {
        onSingleChange(value);
      }
    },
    locale,
    createCalendar,
    isDisabled: disabled,
  });

  const fieldRef = useRef<HTMLDivElement>(null);

  const fieldAria = useDateField(
    { "aria-label": "Date" },
    fieldState,
    fieldRef,
  );

  return (
    <div
      ref={ref}
      className="flex w-full items-center"
      onCopy={onCopy}
      onPaste={onPaste}
      role="group"
      aria-label="Date"
    >
      <div className="flex flex-1 items-center rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
        <div
          {...fieldAria.fieldProps}
          ref={fieldRef}
          className="flex-1 flex items-center"
        >
          {fieldState.segments.map((segment, i) => (
            <DateSegment
              key={i}
              segment={segment}
              state={fieldState}
              className="outline-none placeholder:text-muted-foreground focus:bg-accent focus:text-accent-foreground"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Sub-component for the calendar
function DateCalendar({
  selected,
  onDateChange,
  disabled,
}: {
  selected?: Maybe<CalendarDate>;
  onDateChange: (date?: CalendarDate) => void;
  disabled?: boolean;
}) {
  const { locale } = useLocale();
  const value = selected || undefined;

  const state = useCalendarState({
    value,
    onChange: (v) => {
      if (v) {
        onDateChange(v);
      }
    },
    visibleDuration: { months: 1 },
    locale,
    createCalendar,
    isDisabled: disabled,
  });

  const ref = useRef<HTMLDivElement>(null);
  const { calendarProps, prevButtonProps, nextButtonProps } = useCalendar(
    {
      "aria-label": "Date picker",
      autoFocus: true,
    },
    state,
  );

  const { gridProps, headerProps, weekDays, weeksInMonth } = useCalendarGrid(
    { weekdayStyle: "short", firstDayOfWeek: "sun" },
    state,
  );

  return (
    <div {...calendarProps} ref={ref} className="p-3">
      <header className="flex items-center justify-between pb-4">
        <AriaButton
          {...prevButtonProps}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </AriaButton>
        <div className="text-sm font-medium">
          {state.focusedDate &&
            new Date(
              state.focusedDate.year,
              state.focusedDate.month - 1,
              state.focusedDate.day,
            ).toLocaleDateString(locale, {
              month: "long",
              year: "numeric",
            })}
        </div>
        <AriaButton
          {...nextButtonProps}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ChevronRight className="h-4 w-4" />
        </AriaButton>
      </header>
      <div className="flex flex-row gap-8 items-start w-fit">
        <CalendarGrid gridProps={gridProps}>
          <CalendarGridHeader headerProps={headerProps} weekDays={weekDays}>
            {(day) => (
              <CalendarHeaderCell className="text-muted-foreground text-sm font-normal">
                {day}
              </CalendarHeaderCell>
            )}
          </CalendarGridHeader>
          <CalendarGridBody>
            {Array.from({ length: weeksInMonth }, (_, weekIndex) => (
              <React.Fragment key={weekIndex}>
                {state.getDatesInWeek(weekIndex).map((date, dayIndex) =>
                  date ? (
                    <CalendarCell
                      key={dayIndex}
                      date={date}
                      state={state}
                      className={calendarCellClassName}
                    />
                  ) : (
                    <div key={dayIndex} /> // Empty cell for missing dates
                  ),
                )}
              </React.Fragment>
            ))}
          </CalendarGridBody>
        </CalendarGrid>
      </div>
    </div>
  );
}

// Calendar cell styling function
const calendarCellClassName = (state: {
  date: CalendarDate;
  isSelected: boolean;
  isOutsideMonth: boolean;
  isDisabled: boolean;
  isFocusVisible: boolean;
}) => {
  const baseClasses = cn(
    "size-9 flex items-center justify-center cursor-pointer transition-colors rounded-md text-center text-sm font-normal",
    "hover:bg-accent",
    "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
  );

  const conditionalClasses = cn(
    // Selection styling
    state.isSelected && "bg-primary text-primary-foreground",

    // Outside month styling
    state.isOutsideMonth && "opacity-70",

    // Today styling - just the dot, no background
    isToday(state.date, getLocalTimeZone()) && [
      "relative after:content-[''] after:absolute after:top-[4px] after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:pointer-events-none",
      state.isSelected ? "after:bg-primary-foreground" : "after:bg-primary",
    ],
  );

  return cn(baseClasses, conditionalClasses);
};

export function DatePicker({
  value,
  onChange,
  // placeholder = "Pick a date",
  disabled = false,
  className,
}: DatePickerProps) {
  const handleCopy = (event: React.ClipboardEvent) => {
    if (value) {
      const formattedDate = formatDateForClipboard(value);
      event.clipboardData.setData("text/plain", formattedDate);
      event.preventDefault();
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const pastedText = event.clipboardData.getData("text/plain");
    const parsedDate = parseDateString(pastedText);
    if (parsedDate) {
      onChange(parsedDate);
      event.preventDefault();
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <OpenState>
        {({ open, onOpenChange, close }) => (
          <Popover open={open} onOpenChange={onOpenChange}>
            <div className="flex w-full items-center">
              <DateValueInput
                selected={value}
                onSingleChange={onChange}
                disabled={disabled}
                onCopy={handleCopy}
                onPaste={handlePaste}
              />
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={disabled}
                  className="ml-2 flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </PopoverTrigger>
            </div>
            <PopoverContent className="w-auto p-0" align="end">
              <DateCalendar
                selected={value}
                onDateChange={(date) => {
                  if (date) {
                    onChange(date);
                    close();
                  }
                }}
                disabled={disabled}
              />
            </PopoverContent>
          </Popover>
        )}
      </OpenState>
    </div>
  );
}
