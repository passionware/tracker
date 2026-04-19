"use client";

import {
  AriaCalendarBody,
  AriaCalendarFooter,
  AriaCalendarHeader,
} from "@/components/ui/aria-calendar.tsx";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { OpenState } from "@/features/_common/OpenState.tsx";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/platform/react/use-mobile.tsx";
import {
  CalendarDate,
  getLocalTimeZone,
  today,
} from "@internationalized/date";
import { Maybe } from "@passionware/monads";
import { CalendarIcon, X } from "lucide-react";
import * as React from "react";
import {
  Calendar,
  DateField,
  DateInput,
  DateSegment,
} from "react-aria-components";

export interface DatePickerProps {
  value: Maybe<CalendarDate>;
  onChange: (date: Maybe<CalendarDate>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Try to parse common pasted formats into a CalendarDate.
// Supports: YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY.
function parseDateString(input: string): CalendarDate | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return safeCalendarDate(+iso[1], +iso[2], +iso[3]);

  const dmy = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) return safeCalendarDate(+dmy[3], +dmy[2], +dmy[1]);

  return null;
}

function safeCalendarDate(
  year: number,
  month: number,
  day: number,
): CalendarDate | null {
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    year < 1900 ||
    year > 2100 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  try {
    const date = new CalendarDate(year, month, day);
    // round-trip catches invalid combinations like Feb 30
    date.toDate(getLocalTimeZone());
    return date;
  } catch {
    return null;
  }
}

function formatDateForClipboard(date: CalendarDate): string {
  const dd = String(date.day).padStart(2, "0");
  const mm = String(date.month).padStart(2, "0");
  return `${dd}.${mm}.${date.year}`;
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
}: DatePickerProps) {
  const isMobile = useIsMobile();

  const handleCopy: React.ClipboardEventHandler<HTMLDivElement> = (event) => {
    if (!value) return;
    event.clipboardData.setData("text/plain", formatDateForClipboard(value));
    event.preventDefault();
  };

  const handlePaste: React.ClipboardEventHandler<HTMLDivElement> = (event) => {
    const pasted = event.clipboardData.getData("text/plain");
    const parsed = parseDateString(pasted);
    if (parsed) {
      onChange(parsed);
      event.preventDefault();
    }
  };

  return (
    <OpenState>
      {({ open, onOpenChange, close }) => {
        const handleSelect = (date: CalendarDate) => {
          onChange(date);
          close();
        };

        const handleClearAll = () => {
          onChange(null);
          close();
        };

        const triggerClassName = cn(
          "flex h-10 w-10 shrink-0 items-center justify-center border-l border-border text-muted-foreground transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus-visible:bg-accent focus-visible:text-accent-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "rounded-r-md",
        );

        return (
          <div
            data-vaul-no-drag=""
            className={cn(
              "group relative flex w-full items-stretch overflow-hidden rounded-md border border-border bg-background text-foreground shadow-xs transition-shadow",
              "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
              disabled && "cursor-not-allowed opacity-50",
              className,
            )}
            onCopy={handleCopy}
            onPaste={handlePaste}
          >
            <DateField
              aria-label={placeholder ?? "Date"}
              value={value ?? null}
              onChange={(d) => onChange((d as CalendarDate | null) ?? null)}
              isDisabled={disabled}
              shouldForceLeadingZeros
              className="flex min-w-0 flex-1"
            >
              <DateInput
                className={cn(
                  "flex h-10 flex-1 items-center px-3 text-sm tabular-nums",
                  "data-[focus-within]:outline-none",
                )}
              >
                {(segment) => (
                  <DateSegment
                    segment={segment}
                    className={cn(
                      "rounded-sm px-0.5 outline-none transition-colors",
                      "tabular-nums",
                      "data-[placeholder=true]:text-muted-foreground/70",
                      "data-[type=literal]:px-px data-[type=literal]:text-muted-foreground",
                      "focus:bg-primary focus:text-primary-foreground",
                      "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
                    )}
                  />
                )}
              </DateInput>
            </DateField>

            {value && !disabled ? (
              <button
                type="button"
                aria-label="Clear date"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
                className={cn(
                  "flex h-10 w-7 shrink-0 items-center justify-center text-muted-foreground/70 transition-colors",
                  "hover:text-foreground",
                  "focus:outline-none focus-visible:text-foreground",
                )}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}

            {isMobile ? (
              <Drawer open={open} onOpenChange={onOpenChange}>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label="Open calendar"
                  onClick={() => onOpenChange(true)}
                  className={triggerClassName}
                >
                  <CalendarIcon className="h-4 w-4" />
                </button>
                <DrawerContent>
                  <DrawerHeader className="text-left">
                    <DrawerTitle>Select date</DrawerTitle>
                  </DrawerHeader>
                  <div className="flex justify-center px-2 pb-6">
                    <DatePickerCalendarPanel
                      value={value ?? null}
                      onSelect={handleSelect}
                      onClear={handleClearAll}
                      large
                    />
                  </div>
                </DrawerContent>
              </Drawer>
            ) : (
              <Popover open={open} onOpenChange={onOpenChange}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label="Open calendar"
                    className={triggerClassName}
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0"
                  align="end"
                  sideOffset={6}
                >
                  <DatePickerCalendarPanel
                    value={value ?? null}
                    onSelect={handleSelect}
                    onClear={handleClearAll}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        );
      }}
    </OpenState>
  );
}

function DatePickerCalendarPanel({
  value,
  onSelect,
  onClear,
  large = false,
}: {
  value: CalendarDate | null;
  onSelect: (date: CalendarDate) => void;
  onClear: () => void;
  large?: boolean;
}) {
  const todayDate = React.useMemo(() => today(getLocalTimeZone()), []);

  return (
    <Calendar
      value={value}
      onChange={(d) => onSelect(d as CalendarDate)}
      autoFocus
      className="select-none p-3"
    >
      <AriaCalendarHeader large={large} />
      <AriaCalendarBody large={large} />
      <AriaCalendarFooter
        onClear={onClear}
        onToday={() => onSelect(todayDate)}
      />
    </Calendar>
  );
}
