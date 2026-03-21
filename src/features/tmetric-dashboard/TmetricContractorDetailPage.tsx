import { myRouting } from "@/routing/myRouting.ts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WithFrontServices } from "@/core/frontServices";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView";
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget";
import { InfiniteTimeline } from "@/platform/passionware-timeline";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/routing/routingUtils.ts";
import { calendarDateToJSDate } from "@/platform/lang/internationalized-date";
import { maybe, rd } from "@passionware/monads";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ByContractorHierarchyView } from "./ByContractorHierarchyView";
import { useTmetricDashboardData } from "./useTmetricDashboardData";

export function TmetricContractorDetailPage(
  props: WithFrontServices & {
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  const { services, workspaceId, clientId } = props;
  const { contractorId: contractorIdParam } = useParams<{
    contractorId: string;
  }>();
  const contractorId =
    contractorIdParam != null && /^\d+$/.test(contractorIdParam)
      ? Number(contractorIdParam)
      : null;

  const data = useTmetricDashboardData({ services, workspaceId, clientId });
  const {
    contractorIterationBreakdown,
    contractorNameMap,
    timeline,
    iterationsForScope,
    projectsMap,
    handleRefresh,
    canLoadOrRefresh,
    isRefreshing,
  } = data;

  const contractorData = rd.useMemoMap(
    contractorIterationBreakdown,
    (breakdown) => {
      if (contractorId == null || !breakdown) return null;
      return breakdown.find((c) => c.contractorId === contractorId) ?? null;
    },
  );
  const contractorDataForJourney =
    contractorId != null ? contractorData : rd.ofIdle();
  /** Raw breakdown: null when there is no date range in scope (no report scope); array when we have scope. */
  const rawBreakdownForJourney =
    contractorId != null ? contractorIterationBreakdown : rd.ofIdle();

  const timelineFiltered = rd.useMemoMap(timeline, (t) => {
    if (contractorId == null) return { timelineLanes: [], timelineItems: [] };
    return {
      timelineLanes: t.timelineLanes.filter(
        (l) => l.id === String(contractorId),
      ),
      timelineItems: t.timelineItems.filter(
        (i) => i.laneId === String(contractorId),
      ),
    };
  });

  const routing = myRouting
    .forWorkspace(workspaceId)
    .forClient(clientId);
  const backUrl = routing.tmetricDashboardContractor();

  if (contractorId == null) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Invalid contractor.{" "}
              <Link to={backUrl} className="text-primary underline">
                Back to contractors
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex-shrink-0 space-y-4">
        <Link
          to={backUrl}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to contractors
        </Link>
        <div className="flex items-center gap-3">
          <ContractorWidget
            contractorId={maybe.of(contractorId)}
            services={services}
            layout="full"
            size="md"
          />
        </div>
      </div>

      {rd
        .journey(
          rd.combine({
            contractorData: contractorDataForJourney,
            rawBreakdown: rawBreakdownForJourney,
            timelineFiltered,
            contractorNameMap,
          }),
        )
        .wait(() => (
          <div className="mt-4 space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                </div>
              </CardContent>
            </Card>
          </div>
        ))
        .catch(() => (
          <Card className="mt-4">
            <CardContent className="pt-6 flex flex-col items-center gap-4 text-muted-foreground">
              <p>
                Report data is not loaded yet. Click below to fetch from
                TMetric.
              </p>
              {canLoadOrRefresh && (
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  variant="default"
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  Refresh from TMetric
                </Button>
              )}
              <Link to={backUrl} className="text-primary underline text-sm">
                Back to contractors
              </Link>
            </CardContent>
          </Card>
        ))
        .map(
          ({
            contractorData: data,
            rawBreakdown,
            timelineFiltered: tFiltered,
          }) => {
            if (rawBreakdown === null) {
              return (
                <Card className="mt-4">
                  <CardContent className="pt-6 flex flex-col items-center gap-4 text-muted-foreground">
                    <p>
                      No date range in scope. Select iterations or a time preset
                      on the dashboard, then load the report.
                    </p>
                    {canLoadOrRefresh && (
                      <Button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        variant="default"
                      >
                        <RefreshCw
                          className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                        />
                        Refresh from TMetric
                      </Button>
                    )}
                    <Link
                      to={backUrl}
                      className="text-primary underline text-sm"
                    >
                      Back to contractors
                    </Link>
                  </CardContent>
                </Card>
              );
            }
            if (!data) {
              return (
                <Card className="mt-4">
                  <CardContent className="pt-6 text-muted-foreground">
                    No data for this contractor in the current scope. Try another
                    time range or iterations.{" "}
                    <Link to={backUrl} className="text-primary underline">
                      Back to contractors
                    </Link>
                  </CardContent>
                </Card>
              );
            }
          const totalProfitAmount = data.total.profit.reduce(
            (s: number, v: { amount: number }) => s + v.amount,
            0,
          );
          const profitColorClass =
            totalProfitAmount > 0
              ? "text-green-600"
              : totalProfitAmount < 0
                ? "text-red-600"
                : "";
          return (
            <div className="mt-4 flex flex-1 flex-col gap-6 overflow-auto">
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total hours</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="text-2xl font-bold tabular-nums">
                      {data.total.hours.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground"> h</span>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Billing</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CurrencyValueWidget
                      values={data.total.billing}
                      services={services}
                      exchangeService={services.exchangeService}
                      className="text-2xl font-bold"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Cost</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CurrencyValueWidget
                      values={data.total.cost}
                      services={services}
                      exchangeService={services.exchangeService}
                      className="text-2xl font-bold"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Profit</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CurrencyValueWidget
                      values={data.total.profit}
                      services={services}
                      exchangeService={services.exchangeService}
                      className={`text-2xl font-bold ${profitColorClass}`}
                    />
                  </CardContent>
                </Card>
              </div>

              {data.byIteration.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>By iteration</CardTitle>
                    <CardDescription>
                      Hours, rates, cost, billing, and profit per iteration
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ByContractorHierarchyView
                      contractors={[data]}
                      services={services}
                    />
                  </CardContent>
                </Card>
              )}

              {tFiltered.timelineItems.length > 0 && (
                <Card className="flex flex-1 flex-col min-h-[300px]">
                  <CardHeader>
                    <CardTitle>Timeline</CardTitle>
                    <CardDescription>
                      Time entries for this contractor
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-[280px]">
                    <div className="h-full min-h-[280px] w-full overflow-hidden rounded-md border border-border">
                      <InfiniteTimeline
                        items={tFiltered.timelineItems}
                        lanes={tFiltered.timelineLanes}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              <IterationPositionCard
                iterations={iterationsForScope.filter(
                  (i) => i.status === "active",
                )}
                projectsMap={projectsMap}
              />
            </div>
          );
        })}
    </div>
  );
}

function IterationPositionCard({
  iterations,
  projectsMap,
}: {
  iterations: Array<{
    id: number;
    projectId: number;
    periodStart: import("@/api/project-iteration/project-iteration.api").ProjectIteration["periodStart"];
    periodEnd: import("@/api/project-iteration/project-iteration.api").ProjectIteration["periodEnd"];
  }>;
  projectsMap: Map<number, { name: string }>;
}) {
  const now = Date.now();
  const activeWithProgress = useMemo(
    () =>
      iterations
        .map((iter) => {
          const start = calendarDateToJSDate(iter.periodStart).getTime();
          const end = calendarDateToJSDate(iter.periodEnd).getTime();
          const progress =
            end > start
              ? Math.min(1, Math.max(0, (now - start) / (end - start)))
              : 0;
          const projectName =
            projectsMap.get(iter.projectId)?.name ??
            `Project ${iter.projectId}`;
          return {
            id: iter.id,
            label: projectName,
            start,
            end,
            progress,
            isCurrent: now >= start && now <= end,
          };
        })
        .filter((i) => i.isCurrent || (i.progress > 0 && i.progress < 1)),
    [iterations, projectsMap, now],
  );

  if (activeWithProgress.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Where we are</CardTitle>
        <CardDescription>
          Current position in active iteration ranges
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeWithProgress.map((iter) => (
          <div key={iter.id} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{iter.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {Math.round(iter.progress * 100)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${iter.progress * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
