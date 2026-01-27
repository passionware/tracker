import { BooleanFilter } from "@/api/_common/query/filters/BooleanFilter.ts";
import { Label } from "@/components/ui/label.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { ToolbarButton } from "@/features/_common/elements/filters/_common/ToolbarButton.tsx";
import { Maybe } from "@passionware/monads";
import { Check, X } from "lucide-react";
import { useId, useLayoutEffect, useState } from "react";

export interface BooleanFilterWidgetProps {
  value: Maybe<BooleanFilter>;
  onUpdate: (value: Maybe<BooleanFilter>) => void;
  fieldLabel: string;
  disabled?: boolean;
}

export function BooleanFilterWidget({
  value,
  onUpdate,
  fieldLabel,
  disabled,
}: BooleanFilterWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<Maybe<BooleanFilter>>(value);

  useLayoutEffect(() => {
    setFilter(value);
  }, [value]);

  function handleOpenChange(isOpen: boolean) {
    setIsOpen(isOpen);
    if (!isOpen) {
      onUpdate(filter);
    }
  }

  function handleValueChange(value: string) {
    const boolValue = value === "yes";
    if (filter) {
      setFilter({
        ...filter,
        value: boolValue,
      });
    } else {
      setFilter({
        operator: "equal",
        value: boolValue,
      });
    }
  }

  function handleRemove() {
    setFilter(undefined);
    onUpdate(undefined);
  }

  const isActive = !!filter;

  const id = useId();

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <ToolbarButton
          isActive={isActive}
          icon={isActive ? filter.value ? <Check /> : <X /> : null}
          onRemove={handleRemove}
          visuallyDisabled={disabled}
        >
          {isActive
            ? `${fieldLabel}: ${filter.value ? "Yes" : "No"}`
            : fieldLabel}
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent
        className="w-fit min-w-(--radix-popover-trigger-width) p-3"
        align="start"
      >
        <div className="flex flex-col gap-4">
          <Label className="text-sm font-medium">{fieldLabel}</Label>
          <RadioGroup
            value={
              filter?.value === true
                ? "yes"
                : filter?.value === false
                  ? "no"
                  : undefined
            }
            onValueChange={handleValueChange}
            disabled={disabled}
            className="*:w-full"
          >
            <Label className="flex items-center space-x-2 rounded-md border p-2 hocus:bg-slate-50">
              <RadioGroupItem value="yes" id={`${id}-yes`} />
              <div className="w-full text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Yes
              </div>
            </Label>
            <Label className="flex items-center space-x-2 rounded-md border p-2 hocus:bg-slate-50">
              <RadioGroupItem value="no" id={`${id}-no`} />
              <div className="w-full text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                No
              </div>
            </Label>
          </RadioGroup>
        </div>
      </PopoverContent>
    </Popover>
  );
}
