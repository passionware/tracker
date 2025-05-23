"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { OpenState } from "@/features/_common/OpenState.tsx";

import { cn } from "@/lib/utils";
import { delay } from "@/platform/lang/delay.ts";
import { Maybe } from "@passionware/monads";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

interface DatePickerProps {
  value: Maybe<Date>;
  onChange: (date: Maybe<Date>) => void;
  placeholder?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
}: DatePickerProps) {
  return (
    <OpenState>
      {(bag) => (
        <Popover open={bag.open} onOpenChange={bag.onOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !value && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(value, "yyyy-MM-dd") : <span>{placeholder}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              defaultMonth={value || undefined}
              selected={value || undefined}
              onSelect={(date) => {
                onChange(date || null);
                delay(150).then(bag.close);
              }}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      )}
    </OpenState>
  );
}
