import { DateFilter } from "@/api/_common/query/filters/DateFilter";
import {
  AriaCalendarBody,
  AriaCalendarFooter,
  AriaCalendarHeader,
} from "@/components/ui/aria-calendar.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { ToolbarButton } from "@/features/_common/elements/filters/_common/ToolbarButton.tsx";
import { cn } from "@/lib/utils";
import {
  calendarDateToJSDate,
  dateToCalendarDate,
  todayCalendarDate,
} from "@/platform/lang/internationalized-date.ts";
import { useIsMobile } from "@/platform/react/use-mobile.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { CalendarDate } from "@internationalized/date";
import { maybe, Maybe } from "@passionware/monads";
import { Slot } from "@radix-ui/react-slot";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";
import { Calendar, RangeCalendar } from "react-aria-components";

export interface DateFilterWidgetProps
  extends WithServices<[WithFormatService]> {
  value: Maybe<DateFilter>;
  onUpdate: (value: Maybe<DateFilter>) => void;
  fieldLabel: string;
  disabled?: boolean;
  /** If true, only allows range selection ("between" operator) and hides operator tabs. */
  rangeOnly?: boolean;
  /** Optional inclusive minimum selectable date. */
  minDate?: Date;
  /** Optional inclusive maximum selectable date. */
  maxDate?: Date;
}

type Operator = DateFilter["operator"];

const SINGLE_OPERATORS: Operator[] = ["equal", "lessThan", "greaterThan"];

function getMainDate(filter: Maybe<DateFilter>): Date {
  if (!filter) return new Date();
  return filter.operator === "between" ? filter.value.from : filter.value;
}

function getSecondaryDate(filter: Maybe<DateFilter>): Date {
  if (!filter) return new Date();
  return filter.operator === "between" ? filter.value.to : filter.value;
}

function changeOperator(
  filter: Maybe<DateFilter>,
  next: Operator,
): DateFilter {
  const main = getMainDate(filter);
  const secondary = getSecondaryDate(filter);
  switch (next) {
    case "equal":
    case "greaterThan":
    case "lessThan":
      return { operator: next, value: main };
    case "between":
      return {
        operator: "between",
        value: { from: main, to: secondary },
      };
  }
}

export function DateFilterWidget({
  value,
  onUpdate,
  fieldLabel,
  services,
  disabled,
  rangeOnly = false,
  minDate,
  maxDate,
}: DateFilterWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<Maybe<DateFilter>>(value);
  const isMobile = useIsMobile();

  // Sync external value into internal draft.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  function handleOpenChange(next: boolean) {
    setIsOpen(next);
    // Commit on close — preserves the existing widget behaviour where users
    // can play with operator/dates and only confirm by dismissing the popover.
    if (!next) onUpdate(draft);
  }

  function handleClear() {
    setDraft(maybe.ofAbsent());
    onUpdate(maybe.ofAbsent());
    setIsOpen(false);
  }

  const operator: Operator = rangeOnly
    ? "between"
    : (draft?.operator ?? "between");

  // Effective draft (forces "between" when rangeOnly).
  const effectiveDraft: Maybe<DateFilter> =
    rangeOnly && draft && draft.operator !== "between"
      ? maybe.ofAbsent()
      : draft;

  const minCD = minDate ? dateToCalendarDate(minDate) : undefined;
  const maxCD = maxDate ? dateToCalendarDate(maxDate) : undefined;

  const calendarBody = (
    <CalendarBody
      operator={operator}
      draft={effectiveDraft}
      onDraftChange={setDraft}
      minValue={minCD}
      maxValue={maxCD}
      large={isMobile}
    />
  );

  const operatorTabs = !rangeOnly && (
    <Tabs
      value={operator}
      onValueChange={(v) =>
        setDraft(changeOperator(draft, v as Operator))
      }
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="equal">On</TabsTrigger>
        <TabsTrigger value="lessThan">By</TabsTrigger>
        <TabsTrigger value="greaterThan">From</TabsTrigger>
        <TabsTrigger value="between">Between</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  return (
    <Popover onOpenChange={handleOpenChange} open={isOpen} modal>
      <PopoverTrigger asChild>
        <ToolbarButton
          visuallyDisabled={disabled}
          icon={<CalendarIcon className="h-4 w-4" />}
          isActive={maybe.isPresent(value)}
          onRemove={() => {
            setIsOpen(false);
            onUpdate(maybe.ofAbsent());
          }}
        >
          {maybe
            .journey(value)
            .ifPresent((v) => renderLabel(v, services))
            .orElse(fieldLabel)}
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "flex w-auto flex-col gap-2 p-3",
          // On very small viewports keep the popover narrow but allow the
          // calendar to scroll horizontally if locale renders wider weekdays.
          "max-w-[calc(100vw-1.5rem)] overflow-x-auto",
        )}
        align="start"
      >
        {operatorTabs}
        {calendarBody}
        <AriaCalendarFooter
          onClear={handleClear}
          onToday={() => {
            const t = todayCalendarDate();
            const tDate = calendarDateToJSDate(t);
            setDraft(
              operator === "between"
                ? {
                    operator: "between",
                    value: { from: tDate, to: tDate },
                  }
                : { operator, value: tDate },
            );
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function renderLabel(
  value: DateFilter,
  services: { formatService: WithFormatService["formatService"] },
): React.ReactNode {
  switch (value.operator) {
    case "equal":
      return services.formatService.temporal.single.compact(value.value);
    case "greaterThan":
      return (
        <div className="flex flex-row items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5" />
          <span>
            {services.formatService.temporal.single.compact(value.value)}
          </span>
        </div>
      );
    case "lessThan":
      return (
        <div className="flex flex-row items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>
            {services.formatService.temporal.single.compact(value.value)}
          </span>
        </div>
      );
    case "between":
      return (
        <Slot className="text-xs *:flex-row *:gap-2">
          {services.formatService.temporal.range.compact(
            value.value.from,
            value.value.to,
          )}
        </Slot>
      );
  }
}

interface CalendarBodyProps {
  operator: Operator;
  draft: Maybe<DateFilter>;
  onDraftChange: (next: Maybe<DateFilter>) => void;
  minValue?: CalendarDate;
  maxValue?: CalendarDate;
  large?: boolean;
}

function CalendarBody({
  operator,
  draft,
  onDraftChange,
  minValue,
  maxValue,
  large = false,
}: CalendarBodyProps) {
  const isSingle = SINGLE_OPERATORS.includes(operator);

  if (isSingle) {
    const selected =
      draft && draft.operator !== "between"
        ? dateToCalendarDate(draft.value)
        : null;
    return (
      <Calendar
        value={selected}
        onChange={(d) => {
          if (!d) {
            onDraftChange(maybe.ofAbsent());
            return;
          }
          onDraftChange({
            operator: operator as Exclude<Operator, "between">,
            value: calendarDateToJSDate(d as CalendarDate),
          });
        }}
        minValue={minValue}
        maxValue={maxValue}
        autoFocus
        className="select-none"
      >
        <AriaCalendarHeader large={large} />
        <AriaCalendarBody large={large} />
      </Calendar>
    );
  }

  // range
  const range =
    draft && draft.operator === "between"
      ? {
          start: dateToCalendarDate(draft.value.from),
          end: dateToCalendarDate(draft.value.to),
        }
      : null;

  return (
    <RangeCalendar
      value={range}
      onChange={(r) => {
        if (!r) {
          onDraftChange(maybe.ofAbsent());
          return;
        }
        onDraftChange({
          operator: "between",
          value: {
            from: calendarDateToJSDate(r.start as CalendarDate),
            to: calendarDateToJSDate(r.end as CalendarDate),
          },
        });
      }}
      minValue={minValue}
      maxValue={maxValue}
      visibleDuration={{ months: large ? 1 : 2 }}
      autoFocus
      className="select-none"
    >
      <AriaCalendarHeader large={large} />
      <div className="flex gap-6">
        <AriaCalendarBody isRange large={large} />
        {!large && (
          <AriaCalendarBody isRange large={large} offset={{ months: 1 }} />
        )}
      </div>
    </RangeCalendar>
  );
}
