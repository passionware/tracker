"use client";

import { cn } from "@/lib/utils";
import { CalendarDate } from "@internationalized/date";
import { Maybe } from "@passionware/monads";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DatePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  Popover,
} from "react-aria-components";

interface DatePicker2Props {
  value: Maybe<CalendarDate>;
  onChange: (date: Maybe<CalendarDate>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
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

export function DatePicker2({
  value,
  onChange,
  // placeholder = "Pick a date",
  disabled = false,
  className,
}: DatePicker2Props) {
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
    <DatePicker
      value={value || null}
      onChange={(date: CalendarDate | null) => onChange(date || null)}
      isDisabled={disabled}
      className={cn("w-full", className)}
    >
      <Group
        className="flex w-full items-center"
        onCopy={handleCopy}
        onPaste={handlePaste}
      >
        <DateInput className="flex flex-1 items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300">
          {(segment) => (
            <DateSegment
              segment={segment}
              className="outline-none placeholder:text-slate-500 focus:bg-slate-100 focus:text-slate-900 dark:placeholder:text-slate-400 dark:focus:bg-slate-800 dark:focus:text-slate-50"
            />
          )}
        </DateInput>
        <Button className="ml-2 flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-900 hover:bg-slate-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:hover:bg-slate-800 dark:focus-visible:ring-slate-300">
          <ChevronDown className="h-4 w-4" />
        </Button>
      </Group>
      <Popover className="w-auto">
        <Dialog className="w-auto p-0">
          <div className="z-50 w-72 rounded-md border border-slate-200 bg-white p-0 text-slate-950 shadow-md outline-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
            <Calendar className="p-3">
              <header className="flex items-center justify-between pb-4">
                <Button
                  slot="previous"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-900 hover:bg-slate-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:hover:bg-slate-800 dark:focus-visible:ring-slate-300"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Heading className="text-sm font-medium" />
                <Button
                  slot="next"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-900 hover:bg-slate-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:hover:bg-slate-800 dark:focus-visible:ring-slate-300"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </header>
              <CalendarGrid className="w-full border-collapse space-y-1">
                {(date) => (
                  <CalendarCell
                    date={date}
                    className={cn(
                      "size-9 flex items-center justify-center cursor-pointer transition-colors rounded-md text-center text-sm font-normal",
                      "hover:bg-slate-100",
                      "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      // Only apply selection styling to truly selected dates
                      "data-[selected]:bg-slate-900 data-[selected]:text-slate-50",
                      "dark:hover:bg-slate-800 dark:focus-visible:ring-slate-300",
                      "dark:data-[selected]:bg-slate-50 dark:data-[selected]:text-slate-900",
                    )}
                  />
                )}
              </CalendarGrid>
            </Calendar>
          </div>
        </Dialog>
      </Popover>
    </DatePicker>
  );
}
