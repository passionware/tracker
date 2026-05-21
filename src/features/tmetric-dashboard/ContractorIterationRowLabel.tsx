import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView";
import { WithFrontServices } from "@/core/frontServices";
import type { FormatService } from "@/services/FormatService/FormatService";
import { cn } from "@/lib/utils";
import { maybe } from "@passionware/monads";
import type { ContractorIterationTotals } from "./tmetric-dashboard.utils";

/** Compact rate text when no TMetric project name is available for the row. */
export function formatContractorRateGroupFallbackCaption(
  formatService: FormatService,
  row: Pick<
    ContractorIterationTotals,
    "costRate" | "costCurrency" | "billingRate" | "billingCurrency"
  >,
): string {
  const cost = formatService.financial.amountText(
    row.costRate,
    row.costCurrency,
  );
  const billing = formatService.financial.amountText(
    row.billingRate,
    row.billingCurrency,
  );
  const sameRate =
    row.costRate === row.billingRate &&
    row.costCurrency.toUpperCase() === row.billingCurrency.toUpperCase();
  if (sameRate) return `${cost}/h`;
  return `${cost}/h cost · ${billing}/h bill`;
}

export function formatContractorRateGroupInlineLabel(
  formatService: FormatService,
  row: ContractorIterationTotals,
): string {
  if (row.rateProjectLabel) return row.rateProjectLabel;
  return formatContractorRateGroupFallbackCaption(formatService, row);
}

export function ContractorIterationRowLabel({
  row,
  showRateGroup,
  services,
  className,
}: {
  row: ContractorIterationTotals;
  /** When true, append an inline label (project or rates) after the contractor name. */
  showRateGroup: boolean;
  services: WithFrontServices["services"];
  className?: string;
}) {
  if (!showRateGroup) {
    return (
      <ContractorWidget
        contractorId={maybe.of(row.contractorId)}
        services={services}
        layout="full"
        size="sm"
        className={cn("min-w-0", className)}
      />
    );
  }

  const inlineLabel = formatContractorRateGroupInlineLabel(
    services.formatService,
    row,
  );

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1.5",
        className,
      )}
    >
      <ContractorWidget
        contractorId={maybe.of(row.contractorId)}
        services={services}
        layout="full"
        size="sm"
        className="min-w-0 shrink"
      />
      <span
        className="min-w-0 truncate text-xs text-muted-foreground"
        title={inlineLabel}
      >
        · {inlineLabel}
      </span>
    </div>
  );
}
