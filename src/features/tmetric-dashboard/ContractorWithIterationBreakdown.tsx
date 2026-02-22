import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView";
import { WithFrontServices } from "@/core/frontServices";
import { maybe } from "@passionware/monads";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ContractorIterationBreakdown } from "./tmetric-dashboard.utils";

export function ContractorWithIterationBreakdown({
  contractorId,
  total,
  byIteration,
  services,
}: {
  contractorId: number;
  total: ContractorIterationBreakdown["total"];
  byIteration: ContractorIterationBreakdown["byIteration"];
  services: WithFrontServices["services"];
}) {
  const [open, setOpen] = useState(false);
  const hasIterationBreakdown = byIteration.length > 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border">
        <CollapsibleTrigger asChild>
          <div className="flex cursor-pointer flex-col gap-2 p-4 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ContractorWidget
                contractorId={maybe.of(contractorId)}
                services={services}
                layout="full"
                size="sm"
              />
              {hasIterationBreakdown && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                  {byIteration.length} iteration(s)
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Cost: </span>
                <CurrencyValueWidget
                  values={total.cost}
                  services={services}
                  exchangeService={services.exchangeService}
                  className="font-medium"
                />
              </div>
              <div>
                <span className="text-muted-foreground">Billing: </span>
                <CurrencyValueWidget
                  values={total.billing}
                  services={services}
                  exchangeService={services.exchangeService}
                  className="font-medium"
                />
              </div>
              <div>
                <span className="text-muted-foreground">Profit: </span>
                <Badge variant="secondary">
                  <CurrencyValueWidget
                    values={total.profit}
                    services={services}
                    exchangeService={services.exchangeService}
                    className="text-inherit"
                  />
                </Badge>
              </div>
              <span className="text-muted-foreground">
                {total.hours.toFixed(1)}h · {total.entries} entries
              </span>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {hasIterationBreakdown && (
            <div className="border-t bg-muted/30 px-4 py-3">
              <div className="space-y-2">
                {byIteration.map((iter) => (
                  <div
                    key={iter.iterationId}
                    className="flex flex-wrap items-center gap-4 rounded bg-background px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{iter.iterationLabel}</span>
                    <CurrencyValueWidget
                      values={iter.cost}
                      services={services}
                      exchangeService={services.exchangeService}
                    />
                    <CurrencyValueWidget
                      values={iter.billing}
                      services={services}
                      exchangeService={services.exchangeService}
                    />
                    <Badge variant="secondary" className="text-xs">
                      <CurrencyValueWidget
                        values={iter.profit}
                        services={services}
                        exchangeService={services.exchangeService}
                        className="text-inherit"
                      />
                    </Badge>
                    <span className="text-muted-foreground">
                      {iter.hours.toFixed(1)}h · {iter.entries} entries
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
