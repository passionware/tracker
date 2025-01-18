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
import { ReactNode } from "react";

export interface SummaryCurrencyGroupProps
  extends WithServices<[WithFormatService]> {
  group: CurrencyValueGroup;
  label: ReactNode;
}

export function SummaryCurrencyGroup({
  group,
  label,
  services,
}: SummaryCurrencyGroupProps) {
  return (
    <SummaryEntry label={label}>
      {maybe.map(group, (group) => {
        if (group.values.length === 1) {
          const summaryEntryValue = (
            <>
              <SummaryEntryValue>
                {services.formatService.financial.currency(group.values[0])}
              </SummaryEntryValue>
            </>
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
                <SummaryEntryValue className="flex flex-row gap-1">
                  {services.formatService.financial.currency(group.values[0])}
                </SummaryEntryValue>
              </SimpleTooltip>
            );
          }
          return summaryEntryValue;
        }
        return (
          <SimpleTooltip
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
            <SummaryEntryValue className="flex flex-row gap-1">
              ~{" "}
              {services.formatService.financial.currency(
                group.approximatedJointValue,
              )}
            </SummaryEntryValue>
          </SimpleTooltip>
        );
      })}
    </SummaryEntry>
  );
}
