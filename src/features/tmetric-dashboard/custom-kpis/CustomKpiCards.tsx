import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WithFrontServices } from "@/core/frontServices";
import type { ContractorsSummaryScoped } from "@/features/tmetric-dashboard/tmetric-dashboard.utils";
import { Plus, Settings2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { CustomKpiManagerDialog } from "./CustomKpiManagerDialog";
import { useCustomKpiValues } from "./useCustomKpiValues";
import { formatKpiValue } from "./customKpiFormat";

export function CustomKpiCards({
  services,
  contractorsSummary,
  contractorNameMap,
}: {
  services: WithFrontServices["services"];
  contractorsSummary: ContractorsSummaryScoped | null;
  contractorNameMap: Map<number, string>;
}) {
  const [open, setOpen] = useState(false);
  const kpis = services.preferenceService.useCustomDashboardKpis();
  const evaluations = useCustomKpiValues(services, kpis, contractorsSummary);

  if (kpis.length === 0) {
    return (
      <>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Build your own KPI cards from dashboard data — effective rate,
              cost share, contribution, etc.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add custom KPI
            </Button>
          </CardContent>
        </Card>
        <CustomKpiManagerDialog
          open={open}
          onOpenChange={setOpen}
          services={services}
          contractorsSummary={contractorsSummary}
          contractorNameMap={contractorNameMap}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Custom KPIs
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(true)}
            className="h-7 gap-1.5 px-2 text-xs"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Manage
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {evaluations.map(({ kpi, result }) => {
            const error = !result.ok ? result.error : null;
            const value = result.ok ? result.value : null;
            const filterCount = kpi.contractorIds?.length ?? 0;
            const filterLabel =
              filterCount > 0
                ? filterCount === 1
                  ? contractorNameMap.get(kpi.contractorIds![0]) ??
                    `1 contractor`
                  : `${filterCount} contractors`
                : null;
            return (
              <Card key={kpi.id} className="min-w-0">
                <CardContent className="flex min-w-0 flex-col gap-1.5 p-4">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                      {kpi.name}
                    </div>
                    {error && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs text-xs">{error}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <div className="truncate text-2xl font-semibold tabular-nums">
                    {error ? "—" : formatKpiValue(value, kpi.display, kpi.baseCurrency)}
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    {filterLabel && (
                      <Badge variant="secondary" className="max-w-full truncate">
                        <span className="truncate">{filterLabel}</span>
                      </Badge>
                    )}
                    {kpi.description && (
                      <span className="min-w-0 truncate text-xs text-muted-foreground">
                        {kpi.description}
                      </span>
                    )}
                  </div>
                  <code className="min-w-0 truncate text-[10px] text-muted-foreground/70">
                    {kpi.formula}
                  </code>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      <CustomKpiManagerDialog
        open={open}
        onOpenChange={setOpen}
        services={services}
        contractorsSummary={contractorsSummary}
        contractorNameMap={contractorNameMap}
      />
    </>
  );
}
