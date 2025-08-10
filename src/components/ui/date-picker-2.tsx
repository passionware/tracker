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

export function DatePicker2({
  value,
  onChange,
  // placeholder = "Pick a date",
  disabled = false,
  className,
}: DatePicker2Props) {
  return (
    <DatePicker
      value={value || null}
      onChange={(date: CalendarDate | null) => onChange(date || null)}
      isDisabled={disabled}
      className={cn("w-full", className)}
    >
      <Group className="flex w-full items-center">
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
          <div className="z-50 w-72 rounded-md border border-slate-200 bg-white p-4 text-slate-950 shadow-md outline-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
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
                    className="h-9 w-9 rounded-md text-center text-sm font-normal hover:bg-slate-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[selected]:bg-slate-900 data-[selected]:text-slate-50 data-[selected]:hover:bg-slate-900/90 dark:hover:bg-slate-800 dark:focus-visible:ring-slate-300 dark:data-[selected]:bg-slate-50 dark:data-[selected]:text-slate-900 dark:data-[selected]:hover:bg-slate-50/90"
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
