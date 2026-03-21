import { PopoverHeader } from "@/components/ui/popover.tsx";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import {
  SummaryEntry,
  SummaryEntryValue,
} from "@/features/_common/Summary.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { CurrencyValueGroup } from "@/services/ExchangeService/ExchangeService.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { maybe } from "@passionware/monads";
import { cn } from "@/lib/utils.ts";
import { ReactNode } from "react";

const stripValueClass =
  "text-sm font-semibold tabular-nums tracking-tight text-foreground";

export interface SummaryCurrencyGroupProps
  extends WithServices<[WithFormatService]> {
  group: CurrencyValueGroup;
  label: ReactNode;
  description?: ReactNode;
  variant?: "card" | "strip";
}

export function SummaryCurrencyGroup({
  group,
  label,
  services,
  description,
  variant = "card",
}: SummaryCurrencyGroupProps) {
  return (
    <SummaryEntry
      label={label}
      description={description}
      variant={variant}
    >
      {maybe.map(group, (group) => {
        if (group.values.length === 1) {
          const formatted = services.formatService.financial.currency(
            group.values[0],
          );
          const summaryEntryValue = variant === "strip" ? (
            <span className={stripValueClass}>{formatted}</span>
          ) : (
            <SummaryEntryValue>{formatted}</SummaryEntryValue>
          );
          if (
            group.approximatedJointValue.currency.toUpperCase() !==
            group.values[0].currency.toUpperCase()
          ) {
            return (
              <SimpleTooltip
                light
                title={
                  <div className="space-y-2">
                    <PopoverHeader>
                      Equivalent in{" "}
                      {services.formatService.financial.currencySymbol(
                        group.approximatedJointValue.currency,
                      )}
                    </PopoverHeader>
                    <SummaryEntryValue>
                      {services.formatService.financial.currency(
                        group.approximatedJointValue,
                      )}
                    </SummaryEntryValue>
                  </div>
                }
              >
                {variant === "strip" ? (
                  <span className={cn(stripValueClass, "cursor-help")}>
                    {formatted}
                  </span>
                ) : (
                  <SummaryEntryValue className="flex flex-row gap-1">
                    {formatted}
                  </SummaryEntryValue>
                )}
              </SimpleTooltip>
            );
          }
          return summaryEntryValue;
        }
        return (
          <SimpleTooltip
            light
            title={
              <div className="space-y-2">
                <PopoverHeader>Currency values</PopoverHeader>
                {group.values.map((value, index) => (
                  <SummaryEntryValue key={index}>
                    {services.formatService.financial.currency(value)}
                  </SummaryEntryValue>
                ))}
              </div>
            }
          >
            {variant === "strip" ? (
              <span className={cn(stripValueClass, "cursor-help")}>
                ~{" "}
                {services.formatService.financial.currency(
                  group.approximatedJointValue,
                )}
              </span>
            ) : (
              <SummaryEntryValue className="flex flex-row gap-1">
                ~{" "}
                {services.formatService.financial.currency(
                  group.approximatedJointValue,
                )}
              </SummaryEntryValue>
            )}
          </SimpleTooltip>
        );
      })}
    </SummaryEntry>
  );
}
