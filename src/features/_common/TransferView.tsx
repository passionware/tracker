import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { CurrencyValue } from "@/services/CurrencyService/CurrencyService.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { ChevronsRight } from "lucide-react";
import { ReactNode } from "react";

export interface TransferViewProps extends WithServices<[WithFormatService]> {
  fromAmount: CurrencyValue;
  toAmount: CurrencyValue;
  fromLabel?: ReactNode;
  toLabel?: ReactNode;
}
export function TransferView({
  services,
  toAmount,
  fromAmount,
  fromLabel,
  toLabel,
}: TransferViewProps) {
  return (
    <div className="flex justify-center gap-4">
      <div
        className={cn(
          "flex flex-col gap-2 items-end",
          fromAmount.amount === 0 ? "text-gray-800" : "text-red-800",
        )}
      >
        <Badge tone="outline" variant="destructive">
          {fromLabel ?? "Remaining"}
        </Badge>{" "}
        {services.formatService.financial.currency(fromAmount)}
      </div>
      <ChevronsRight className="size-10" strokeWidth={1} />
      <div className="text-green-700 flex flex-col gap-2 items-start">
        <Badge tone="outline" variant="positive">
          {toLabel ?? "Reconciled"}
        </Badge>{" "}
        {services.formatService.financial.currency(toAmount)}
      </div>
    </div>
  );
}