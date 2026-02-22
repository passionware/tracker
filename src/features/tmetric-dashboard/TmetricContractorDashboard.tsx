import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WithFrontServices } from "@/core/frontServices";
import type { ContractorsWithIntegrationStatus } from "@/services/front/TmetricDashboardService/TmetricDashboardService";
import type { ContractorIterationBreakdown } from "./tmetric-dashboard.utils";
import type { RemoteData } from "@passionware/monads";
import { rd } from "@passionware/monads";
import { ContractorWithIterationBreakdown } from "./ContractorWithIterationBreakdown";
import { TmetricHoursPieChart } from "./TmetricHoursPieChart";

export function TmetricContractorDashboard({
  services,
  contractorIterationBreakdown,
  contractorNameMap,
  integrationStatus,
}: {
  services: WithFrontServices["services"];
  contractorIterationBreakdown: RemoteData<ContractorIterationBreakdown[] | null>;
  contractorNameMap: RemoteData<Map<number, string>>;
  integrationStatus: ContractorsWithIntegrationStatus | null;
}) {
  return rd
    .journey(
      rd.combine({
        contractorIterationBreakdown,
        contractorNameMap,
      }),
    )
    .wait(() => (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    ))
    .catch(() => (
      <Card>
        <CardContent className="pt-6 text-muted-foreground">
          Load report data first (Overview tab, then Refresh from TMetric).
        </CardContent>
      </Card>
    ))
    .map(
      ({
        contractorIterationBreakdown: breakdown,
        contractorNameMap: nameMap,
      }: {
        contractorIterationBreakdown: ContractorIterationBreakdown[] | null;
        contractorNameMap: Map<number, string>;
      }) => {
        if (!breakdown || breakdown.length === 0) {
          return (
            <Card>
              <CardHeader>
                <CardTitle>Contractor dashboard</CardTitle>
                <CardDescription>
                  Hours, cost, billing, and profit per contractor
                </CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                No contractor data in the selected range. Load report and
                choose a time range that includes time entries.
              </CardContent>
            </Card>
          );
        }

        const integratedIds = new Set(
          integrationStatus?.integratedContractorIds ?? [],
        );
        const displayed =
          integratedIds.size > 0
            ? breakdown.filter((c) => integratedIds.has(c.contractorId))
            : breakdown;
        const excludedCount = breakdown.length - displayed.length;

        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contractor dashboard</CardTitle>
                <CardDescription>
                  Hours, cost, billing, and profit per contractor. Expand a row
                  to see breakdown by iteration.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {excludedCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {excludedCount} contractor(s) in cached data are no longer
                    integrated and excluded from this view.
                  </p>
                )}
                {displayed.map((c) => (
                  <ContractorWithIterationBreakdown
                    key={c.contractorId}
                    contractorId={c.contractorId}
                    total={c.total}
                    byIteration={c.byIteration}
                    services={services}
                  />
                ))}
              </CardContent>
            </Card>

            <TmetricHoursPieChart
              contractorBreakdown={displayed}
              contractorNameMap={nameMap}
            />
          </div>
        );
    });
}
