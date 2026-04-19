import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WithFrontServices } from "@/core/frontServices";
import type { ContractorsWithIntegrationStatus } from "@/services/front/TmetricDashboardService/TmetricDashboardService";
import type { ContractorIterationBreakdown } from "./tmetric-dashboard.utils";
import type { RemoteData } from "@passionware/monads";
import { rd } from "@passionware/monads";
import { RefreshCw } from "lucide-react";
import { ByContractorHierarchyView } from "./ByContractorHierarchyView";
import { TmetricHoursPieChart } from "./TmetricHoursPieChart";

export function TmetricContractorDashboard({
  services,
  contractorIterationBreakdown,
  contractorNameMap,
  integrationStatus,
  getContractorDetailUrl,
  onRefresh,
  canLoadOrRefresh,
  isRefreshing,
}: {
  services: WithFrontServices["services"];
  contractorIterationBreakdown: RemoteData<
    ContractorIterationBreakdown[] | null
  >;
  contractorNameMap: RemoteData<Map<number, string>>;
  integrationStatus: ContractorsWithIntegrationStatus | null;
  /** When set, contractor names link to the contractor detail page. */
  getContractorDetailUrl?: (contractorId: number) => string;
  /** When set, .catch() shows a Refresh button to load report data. */
  onRefresh?: () => void;
  canLoadOrRefresh?: boolean;
  isRefreshing?: boolean;
}) {
  return rd
    .journey(
      rd.combine({
        contractorIterationBreakdown,
        contractorNameMap,
      }),
    )
    .wait(() => (
      <Card className="min-w-0">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent className="min-w-0 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    ))
    .catch(() => (
      <Card className="min-w-0">
        <CardContent className="min-w-0 pt-6 flex flex-col items-center gap-4 text-muted-foreground">
          <p>
            Report data is not loaded yet. Click below to fetch from TMetric.
          </p>
          {canLoadOrRefresh && onRefresh && (
            <Button
              onClick={onRefresh}
              disabled={isRefreshing}
              variant="default"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh from TMetric
            </Button>
          )}
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
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Contractor dashboard</CardTitle>
                <CardDescription>
                  Hours, cost, billing, and profit per contractor
                </CardDescription>
              </CardHeader>
              <CardContent className="min-w-0 text-muted-foreground">
                No contractor data in the selected range. Load report and choose
                a time range that includes time entries.
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
          <div className="min-w-0 space-y-6">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Contractor dashboard</CardTitle>
                <CardDescription>
                  Hours, cost, billing, and profit per contractor. Expand a row
                  to see breakdown by iteration.
                </CardDescription>
              </CardHeader>
              <CardContent className="min-w-0">
                {excludedCount > 0 && (
                  <p className="mb-4 text-sm text-muted-foreground">
                    {excludedCount} contractor(s) in cached data are no longer
                    integrated and excluded from this view.
                  </p>
                )}
                <ByContractorHierarchyView
                  contractors={displayed}
                  services={services}
                  getContractorDetailUrl={getContractorDetailUrl}
                />
              </CardContent>
            </Card>

            <TmetricHoursPieChart
              contractorBreakdown={displayed}
              contractorNameMap={nameMap}
            />
          </div>
        );
      },
    );
}
