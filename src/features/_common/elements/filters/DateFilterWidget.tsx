// todo is currency part of filter? or some global setting which is not configurable?
import { DateFilter } from "@/api/_common/query/filters/DateFilter";
import { Calendar } from "@/components/ui/calendar.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { ToolbarButton } from "@/features/_common/elements/filters/_common/ToolbarButton.tsx";
import { getDisplayOptions } from "@/features/_common/elements/filters/DateFilterWidget.options.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { maybe, Maybe } from "@passionware/monads";
import { CalendarIcon } from "lucide-react";
import { useLayoutEffect, useState } from "react";
import { DateRange } from "react-day-picker";

export interface DateFilterWidgetProps
  extends WithServices<[WithFormatService]> {
  value: Maybe<DateFilter>;
  onUpdate: (value: Maybe<DateFilter>) => void;
  fieldLabel: string;
  disabled?: boolean;
}

export function DateFilterWidget({
  value,
  onUpdate,
  fieldLabel,
  services,
  disabled,
}: DateFilterWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<Maybe<DateFilter>>(value);

  useLayoutEffect(() => {
    setFilter(value);
  }, [value]);

  const formatDate = services.formatService.temporal.date;

  function renderLabel(value: DateFilter) {
    switch (value.operator) {
      case "equal":
        return `= ${formatDate(value.value)}`;
      case "greaterThan":
        return `> ${formatDate(value.value)}`;
      case "lessThan":
        return `< ${formatDate(value.value)}`;
      case "between":
        return `${formatDate(value.value.from)} - ${formatDate(value.value.to)}`;
    }
  }

  function handleOpenChange(isOpen: boolean) {
    setIsOpen(isOpen);
    if (!isOpen) {
      onUpdate(filter);
    }
  }

  const { defaultMonth, ...displayOptions } = getDisplayOptions(
    filter,
    (value) => {
      setFilter(value);
      if (!maybe.isPresent(value)) {
        setFilter(value);
      }
      switch (value?.operator) {
        case "equal":
          setFilter(value);
          break;
        case "greaterThan":
          setFilter(value);
          break;
        case "lessThan":
          setFilter(value);
          break;
        case "between":
          setFilter(value);
          break;
      }
    },
  );

  const getMainDate = (value: Date | DateRange | undefined) => {
    if (value instanceof Date) {
      return value;
    }
    return value?.from ?? new Date();
  };

  const getSecondaryDate = (value: Date | DateRange | undefined) => {
    if (value instanceof Date) {
      return value;
    }
    return value?.to ?? new Date();
  };

  const operator = filter?.operator ?? "between";

  return (
    <Popover onOpenChange={handleOpenChange} open={isOpen} modal>
      <PopoverTrigger asChild>
        <ToolbarButton
          visuallyDisabled={disabled}
          icon={<CalendarIcon className="w-4 h-4" />}
          isActive={maybe.isPresent(value)}
          onRemove={() => {
            setIsOpen(false);
            onUpdate(maybe.ofAbsent());
          }}
        >
          {maybe.journey(value).ifPresent(renderLabel).orElse(fieldLabel)}
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent className="p-1 w-auto flex flex-col " align="start">
        <Tabs value={operator} className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger
              onClick={() => {
                setFilter({
                  operator: "equal",
                  value: getMainDate(displayOptions.selected),
                });
              }}
              value="equal"
            >
              On
            </TabsTrigger>
            <TabsTrigger
              onClick={() => {
                setFilter({
                  operator: "lessThan",
                  value: getMainDate(displayOptions.selected),
                });
              }}
              value="lessThan"
            >
              By
            </TabsTrigger>
            <TabsTrigger
              onClick={() => {
                setFilter({
                  operator: "greaterThan",
                  value: getMainDate(displayOptions.selected),
                });
              }}
              value="greaterThan"
            >
              From
            </TabsTrigger>
            <TabsTrigger
              onClick={() => {
                setFilter({
                  operator: "between",
                  value: {
                    from: getMainDate(displayOptions.selected),
                    to: getSecondaryDate(displayOptions.selected),
                  },
                });
              }}
              value="between"
            >
              Between
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-col gap-2 items-stretch">
          {/*{bookingDateSpecialFilters.map((filterOption) => (*/}
          {/*  <Button*/}
          {/*    key={filterOption}*/}
          {/*    variant={filterOption === filter?.value ? "outline" : "secondary"}*/}
          {/*    size="sm"*/}
          {/*    className="justify-start"*/}
          {/*    onClick={() => {*/}
          {/*      setFilter({*/}
          {/*        operator: "special",*/}
          {/*        value: filterOption,*/}
          {/*      });*/}
          {/*    }}*/}
          {/*  >*/}
          {/*    {t(`dateFilters.${filterOption}`)}*/}
          {/*  </Button>*/}
          {/*))}*/}
        </div>
        <Calendar
          autoFocus
          numberOfMonths={2}
          defaultMonth={defaultMonth}
          {...displayOptions}
        />
      </PopoverContent>
    </Popover>
  );
}
