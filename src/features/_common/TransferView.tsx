import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";
import { WithServices } from "@/platform/typescript/services.ts";

import { CurrencyValue } from "@/services/ExchangeService/ExchangeService.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { ChevronsRight } from "lucide-react";
import { ReactNode } from "react";

export interface TransferViewProps extends WithServices<[WithFormatService]> {
  fromAmount: CurrencyValue;
  toAmount: CurrencyValue;
  fromLabel?: ReactNode;
  toLabel?: ReactNode;
  extraAmount?: CurrencyValue;
  extraLabel?: ReactNode;
}

export function TransferView({
  services,
  toAmount,
  fromAmount,
  fromLabel,
  toLabel,
  extraLabel,
  extraAmount,
}: TransferViewProps) {
  const totalAmount =
    fromAmount.amount + toAmount.amount + (extraAmount?.amount || 0);
  const fromPercentage =
    totalAmount > 0 ? (fromAmount.amount / totalAmount) * 100 : 0;
  const toPercentage =
    totalAmount > 0 ? (toAmount.amount / totalAmount) * 100 : 0;
  const extraPercentage =
    totalAmount > 0 ? ((extraAmount?.amount || 0) / totalAmount) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Main Content */}
      <div className="flex items-center justify-center gap-2">
        <div
          className={cn(
            "flex items-center gap-2",
            fromAmount.amount === 0 ? "text-gray-800" : "text-red-800",
          )}
        >
          <Badge tone="outline" variant="destructive">
            {fromLabel ?? "Remaining"}
          </Badge>
          <span>{services.formatService.financial.currency(fromAmount)}</span>
        </div>
        <ChevronsRight className="size-6" strokeWidth={1} />
        <div
          className={cn(
            "flex items-center gap-2",
            toAmount.amount === 0 ? "text-gray-800" : "text-green-800",
          )}
        >
          <Badge tone="outline" variant="positive">
            {toLabel ?? "Reconciled"}
          </Badge>
          <span>{services.formatService.financial.currency(toAmount)}</span>
        </div>
        {extraAmount && extraLabel && (
          <>
            <ChevronsRight className="size-6" strokeWidth={1} />
            <div
              className={cn(
                "flex items-center gap-2",
                extraAmount.amount === 0 ? "text-gray-800" : "text-green-800",
              )}
            >
              <Badge tone="outline" variant="positive">
                {extraLabel}
              </Badge>
              <span>
                {services.formatService.financial.currency(extraAmount)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Compact Visual Bar */}
      <div className="w-full flex gap-0.5 first:*:rounded-l-full last:*:rounded-r-full">
        <div
          className="h-2 bg-red-800"
          style={{ width: `${fromPercentage}%` }}
          title={`From: ${fromPercentage.toFixed(2)}%`}
        ></div>
        <div
          className="h-2 bg-green-800"
          style={{ width: `${toPercentage}%` }}
          title={`To: ${toPercentage.toFixed(2)}%`}
        ></div>
        {extraAmount && (
          <div
            className="h-2 bg-blue-800"
            style={{ width: `${extraPercentage}%` }}
            title={`Extra: ${extraPercentage.toFixed(2)}%`}
          ></div>
        )}
      </div>
    </div>
  );
}
