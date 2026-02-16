import { TmetricDashboardCacheScope } from "@/api/tmetric-dashboard-cache/tmetric-dashboard-cache.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api";
import { projectIterationQueryUtils } from "@/api/project-iteration/project-iteration.api";
import { projectQueryUtils } from "@/api/project/project.api";
import { calendarDateToJSDate } from "@/platform/lang/internationalized-date";
import { WithFrontServices } from "@/core/frontServices";
import { SimpleArrayPicker } from "@/features/_common/elements/pickers/SimpleArrayPicker";
import type { SimpleItem } from "@/features/_common/elements/pickers/SimpleView";
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView";
import {
  CubeLayout,
  CubeProvider,
  CubeSummary,
  CubeBreakdownControl,
  CubeTimeSubrangeControl,
  CubeHierarchicalBreakdown,
  CubeDimensionExplorer,
} from "@/features/_common/Cube";
import { SerializedCubeViewWithSelection } from "@/features/_common/Cube/SerializedCubeViewWithSelection";
import { CubeTimelineView } from "@/features/_common/Cube/CubeTimelineView";
import { useReportCube } from "@/features/project-iterations/widgets/useReportCube";
import type { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api";
import {
  InfiniteTimeline,
  type Lane,
  type TimelineItem,
} from "@/platform/passionware-timeline";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService";
import { idSpecUtils } from "@/platform/lang/IdSpec";
import { maybe, rd } from "@passionware/monads";
import {
  endOfDay,
  endOfWeek,
  format,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns";
import { fromAbsolute, getLocalTimeZone } from "@internationalized/date";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  CalendarRange,
  ChevronDown,
  Grid3X3,
  RefreshCw,
  TrendingUp,
  UserX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { contractorQueryUtils } from "@/api/contractor/contractor.api";
import type { ContractorsWithIntegrationStatus } from "@/services/front/TmetricDashboardService/TmetricDashboardService";
import { getMatchingRate } from "@/services/io/_common/getMatchingRate";
import type { CurrencyValue } from "@/services/ExchangeService/ExchangeService";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DateRangePreset =
  | "today"
  | "week"
  | "custom"
  | "all"
  | "active_iterations";

function getDateRangeFromIterations(
  iterations: ProjectIteration[],
): { start: Date; end: Date } | null {
  if (iterations.length === 0) return null;
  const starts = iterations.map((i) =>
    calendarDateToJSDate(i.periodStart).getTime(),
  );
  const ends = iterations.map((i) =>
    calendarDateToJSDate(i.periodEnd).getTime(),
  );
  return {
    start: new Date(Math.min(...starts)),
    end: new Date(Math.max(...ends)),
  };
}

function addToBudget(
  acc: Record<string, number>,
  amount: number,
  currency: string,
): void {
  if (!acc[currency]) acc[currency] = 0;
  acc[currency] += amount;
}

function budgetToCurrencyValues(
  byCurrency: Record<string, number>,
): CurrencyValue[] {
  return Object.entries(byCurrency).map(([currency, amount]) => ({
    amount,
    currency,
  }));
}

interface ContractorIterationBreakdown {
  contractorId: number;
  total: { cost: CurrencyValue[]; billing: CurrencyValue[]; profit: CurrencyValue[]; hours: number; entries: number };
  byIteration: Array<{
    iterationId: number;
    iterationLabel: string;
    cost: CurrencyValue[];
    billing: CurrencyValue[];
    profit: CurrencyValue[];
    hours: number;
    entries: number;
  }>;
}

interface IterationSummary {
  iterationId: number;
  iterationLabel: string;
  cost: CurrencyValue[];
  billing: CurrencyValue[];
  profit: CurrencyValue[];
  hours: number;
  entries: number;
}

function findMatchingIteration(
  entry: { startAt: Date; projectId: string },
  iterationPeriods: Array<{
    id: number;
    projectId: number;
    projectName: string;
    start: number;
    end: number;
    label: string;
  }>,
  getEntryProjectName: (projectId: string) => string | undefined,
): typeof iterationPeriods[0] | null {
  const entryStart = entry.startAt.getTime();
  const entryProjectName = getEntryProjectName(entry.projectId)?.toLowerCase();

  const matching = iterationPeriods.filter(
    (p) => entryStart >= p.start && entryStart <= p.end,
  );
  if (matching.length === 0) return null;

  if (matching.length === 1) return matching[0];

  const byProject = entryProjectName
    ? matching.find(
        (p) => p.projectName.toLowerCase() === entryProjectName,
      )
    : null;
  if (byProject) return byProject;

  matching.sort((a, b) => a.end - a.start - (b.end - b.start));
  return matching[0];
}

function getContractorIterationBreakdown(
  report: { data: import("@/services/io/_common/GenericReport").GenericReport },
  iterations: ProjectIteration[],
  projectsMap: Map<number, { name: string }>,
): ContractorIterationBreakdown[] {
  const getEntryProjectName = (projectId: string) =>
    report.data.definitions.projectTypes[projectId]?.name;

  const iterationPeriods = iterations.map((i) => ({
    id: i.id,
    projectId: i.projectId,
    projectName: projectsMap.get(i.projectId)?.name ?? `Project ${i.projectId}`,
    start: calendarDateToJSDate(i.periodStart).getTime(),
    end: endOfDay(calendarDateToJSDate(i.periodEnd)).getTime(),
    label: `${projectsMap.get(i.projectId)?.name ?? `Project ${i.projectId}`} #${i.ordinalNumber}`,
  }));

  const byContractor = new Map<
    number,
    {
      total: {
        cost: Record<string, number>;
        billing: Record<string, number>;
        profit: Record<string, number>;
        hours: number;
        entries: number;
      };
      byIteration: Map<
        number,
        {
          cost: Record<string, number>;
          billing: Record<string, number>;
          profit: Record<string, number>;
          hours: number;
          entries: number;
        }
      >;
    }
  >();

  for (const entry of report.data.timeEntries) {
    const hours =
      (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);
    const matchingRate = getMatchingRate(report.data, entry);
    const cost = hours * matchingRate.costRate;
    const billing = hours * matchingRate.billingRate;

    const matchingIteration = findMatchingIteration(
      entry,
      iterationPeriods,
      getEntryProjectName,
    );

    if (!byContractor.has(entry.contractorId)) {
      byContractor.set(entry.contractorId, {
        total: {
          cost: {},
          billing: {},
          profit: {},
          hours: 0,
          entries: 0,
        },
        byIteration: new Map(),
      });
    }
    const c = byContractor.get(entry.contractorId)!;

    addToBudget(c.total.cost, cost, matchingRate.costCurrency);
    addToBudget(c.total.billing, billing, matchingRate.billingCurrency);
    addToBudget(c.total.profit, billing, matchingRate.billingCurrency);
    addToBudget(c.total.profit, -cost, matchingRate.costCurrency);
    c.total.hours += hours;
    c.total.entries += 1;

    const iterId = matchingIteration?.id ?? -1;
    if (!c.byIteration.has(iterId)) {
      c.byIteration.set(iterId, {
        cost: {},
        billing: {},
        profit: {},
        hours: 0,
        entries: 0,
      });
    }
    const iter = c.byIteration.get(iterId)!;
    addToBudget(iter.cost, cost, matchingRate.costCurrency);
    addToBudget(iter.billing, billing, matchingRate.billingCurrency);
    addToBudget(iter.profit, billing, matchingRate.billingCurrency);
    addToBudget(iter.profit, -cost, matchingRate.costCurrency);
    iter.hours += hours;
    iter.entries += 1;
  }

  return Array.from(byContractor.entries()).map(
    ([contractorId, { total, byIteration }]) => ({
      contractorId,
      total: {
        cost: budgetToCurrencyValues(total.cost),
        billing: budgetToCurrencyValues(total.billing),
        profit: budgetToCurrencyValues(total.profit),
        hours: total.hours,
        entries: total.entries,
      },
      byIteration: Array.from(byIteration.entries()).map(
        ([iterationId, iter]) => ({
          iterationId,
          iterationLabel:
            iterationId === -1
              ? "Other"
              : iterationPeriods.find((p) => p.id === iterationId)?.label ??
                `Iteration ${iterationId}`,
          cost: budgetToCurrencyValues(iter.cost),
          billing: budgetToCurrencyValues(iter.billing),
          profit: budgetToCurrencyValues(iter.profit),
          hours: iter.hours,
          entries: iter.entries,
        }),
      ),
    }),
  );
}

function getIterationSummary(
  report: { data: import("@/services/io/_common/GenericReport").GenericReport },
  iterations: ProjectIteration[],
  projectsMap: Map<number, { name: string }>,
): IterationSummary[] {
  const getEntryProjectName = (projectId: string) =>
    report.data.definitions.projectTypes[projectId]?.name;

  const iterationPeriods = iterations.map((i) => ({
    id: i.id,
    projectId: i.projectId,
    projectName: projectsMap.get(i.projectId)?.name ?? `Project ${i.projectId}`,
    start: calendarDateToJSDate(i.periodStart).getTime(),
    end: endOfDay(calendarDateToJSDate(i.periodEnd)).getTime(),
    label: `${projectsMap.get(i.projectId)?.name ?? `Project ${i.projectId}`} #${i.ordinalNumber} (${format(calendarDateToJSDate(i.periodStart), "dd MMM")} – ${format(calendarDateToJSDate(i.periodEnd), "dd MMM yyyy")})`,
  }));

  const byIteration = new Map<
    number,
    {
      cost: Record<string, number>;
      billing: Record<string, number>;
      profit: Record<string, number>;
      hours: number;
      entries: number;
    }
  >();

  for (const entry of report.data.timeEntries) {
    const hours =
      (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);
    const matchingRate = getMatchingRate(report.data, entry);
    const cost = hours * matchingRate.costRate;
    const billing = hours * matchingRate.billingRate;

    const matchingIteration = findMatchingIteration(
      entry,
      iterationPeriods,
      getEntryProjectName,
    );
    const iterId = matchingIteration?.id ?? -1;

    if (!byIteration.has(iterId)) {
      byIteration.set(iterId, {
        cost: {},
        billing: {},
        profit: {},
        hours: 0,
        entries: 0,
      });
    }
    const iter = byIteration.get(iterId)!;
    addToBudget(iter.cost, cost, matchingRate.costCurrency);
    addToBudget(iter.billing, billing, matchingRate.billingCurrency);
    addToBudget(iter.profit, billing, matchingRate.billingCurrency);
    addToBudget(iter.profit, -cost, matchingRate.costCurrency);
    iter.hours += hours;
    iter.entries += 1;
  }

  const result: IterationSummary[] = iterationPeriods
    .map((p) => {
      const data = byIteration.get(p.id);
      if (!data) return null;
      return {
        iterationId: p.id,
        iterationLabel: p.label,
        cost: budgetToCurrencyValues(data.cost),
        billing: budgetToCurrencyValues(data.billing),
        profit: budgetToCurrencyValues(data.profit),
        hours: data.hours,
        entries: data.entries,
      };
    })
    .filter((x): x is IterationSummary => x !== null);

  const otherData = byIteration.get(-1);
  if (otherData && (otherData.entries > 0 || otherData.hours > 0)) {
    result.push({
      iterationId: -1,
      iterationLabel: "Other (outside iteration periods)",
      cost: budgetToCurrencyValues(otherData.cost),
      billing: budgetToCurrencyValues(otherData.billing),
      profit: budgetToCurrencyValues(otherData.profit),
      hours: otherData.hours,
      entries: otherData.entries,
    });
  }

  return result;
}

function ContractorWithIterationBreakdown({
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

const CHART_COLORS = {
  cost: "var(--chart-2)",
  billing: "var(--chart-1)",
  profit: "var(--chart-3)",
};

function convertToTargetCurrency(
  values: CurrencyValue[],
  rateMap: Map<string, number>,
  targetCurrency: string,
): number {
  return values.reduce((sum, v) => {
    const key = `${v.currency.toUpperCase()}->${targetCurrency.toUpperCase()}`;
    const rate = rateMap.get(key) ?? 0;
    return sum + v.amount * rate;
  }, 0);
}

function TmetricIterationBarChart({
  iterationSummary,
  services,
}: {
  iterationSummary: IterationSummary[];
  services: WithFrontServices["services"];
}) {
  const targetCurrency = "EUR";
  const allCurrencies = Array.from(
    new Set(
      iterationSummary.flatMap((i) =>
        [...i.cost, ...i.billing, ...i.profit].map((v) =>
          v.currency.toUpperCase(),
        ),
      ),
    ),
  );
  const exchangeRates = services.exchangeService.useExchangeRates(
    allCurrencies.length
      ? allCurrencies.map((from) => ({ from, to: targetCurrency }))
      : [{ from: "EUR", to: "EUR" }],
  );

  const chartData =
    rd.tryMap(exchangeRates, (rates) => {
      const rateMap = new Map<string, number>();
      rates.forEach((r) =>
        rateMap.set(`${r.from.toUpperCase()}->${r.to.toUpperCase()}`, r.rate),
      );
      return iterationSummary.map((iter) => ({
        name:
          iter.iterationLabel.length > 20
            ? `${iter.iterationLabel.slice(0, 20)}…`
            : iter.iterationLabel,
        cost: convertToTargetCurrency(iter.cost, rateMap, targetCurrency),
        billing: convertToTargetCurrency(
          iter.billing,
          rateMap,
          targetCurrency,
        ),
        profit: convertToTargetCurrency(iter.profit, rateMap, targetCurrency),
      }));
    }) ?? [];

  if (chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost, billing & profit by iteration</CardTitle>
        <CardDescription>
          Financial breakdown per iteration (converted to {targetCurrency})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-35}
                textAnchor="end"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) =>
                  new Intl.NumberFormat("de-DE", {
                    style: "currency",
                    currency: targetCurrency,
                    maximumFractionDigits: 0,
                  }).format(Number(v))
                }
              />
              <Tooltip
                formatter={(value: number) =>
                  new Intl.NumberFormat("de-DE", {
                    style: "currency",
                    currency: targetCurrency,
                  }).format(value)
                }
                contentStyle={{ fontSize: 12 }}
              />
              <Legend />
              <Bar dataKey="cost" fill={CHART_COLORS.cost} name="Cost" />
              <Bar dataKey="billing" fill={CHART_COLORS.billing} name="Billing" />
              <Bar dataKey="profit" fill={CHART_COLORS.profit} name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
];

function TmetricHoursPieChart({
  contractorBreakdown,
  contractorNameMap,
}: {
  contractorBreakdown: ContractorIterationBreakdown[];
  contractorNameMap: Map<number, string>;
}) {
  const data = contractorBreakdown
    .map((c) => ({
      name:
        contractorNameMap.get(c.contractorId) ?? `Contractor ${c.contractorId}`,
      value: c.total.hours,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hours by contractor</CardTitle>
        <CardDescription>
          Distribution of tracked hours across contractors
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Tooltip
                formatter={(value: number) => `${value.toFixed(1)}h`}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                outerRadius={80}
                paddingAngle={2}
                label={({ name, percent }) =>
                  `${name.length > 12 ? `${name.slice(0, 12)}…` : name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function TmetricCubeExplorer({
  report,
  services,
  className,
}: {
  report: GeneratedReportSource;
  services: WithFrontServices["services"];
  className?: string;
}) {
  const { cubeState, serializableConfig } = useReportCube({ report, services });

  return (
    <CubeProvider value={{ state: cubeState, reportId: "tmetric-dashboard" }}>
      <CubeLayout
        className={
          className ??
          "w-full h-full min-h-0 rounded-md border border-border overflow-hidden"
        }
        leftSidebar={
          <>
            <div className="p-4 space-y-4 flex-1">
              <CubeSummary />
              <CubeTimeSubrangeControl services={services} />
              <CubeBreakdownControl />
            </div>
            <div className="p-4 pt-0">
              <CubeHierarchicalBreakdown />
            </div>
          </>
        }
        rightSidebar={<CubeDimensionExplorer />}
        bottomSlot={<CubeTimelineView />}
      >
        <div className="bg-background w-full h-full flex-1 min-h-0 p-4 flex flex-col">
          <SerializedCubeViewWithSelection
            state={cubeState}
            serializedConfig={serializableConfig}
            maxInitialDepth={0}
            enableZoomIn={true}
          />
        </div>
      </CubeLayout>
    </CubeProvider>
  );
}

function getDateRange(
  preset: DateRangePreset,
  iterationRange?: { start: Date; end: Date } | null,
): { start: Date; end: Date } | null {
  if (preset === "active_iterations") {
    return iterationRange ?? null;
  }
  const now = new Date();
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "week":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case "all":
      return { start: subDays(now, 365), end: now };
    default:
      return { start: subDays(now, 7), end: now };
  }
}

export function TmetricDashboardPage(
  props: WithFrontServices & {
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  const { services, workspaceId, clientId } = props;
  const [datePreset, setDatePreset] = useState<DateRangePreset>("week");
  const [cachedReport, setCachedReport] = useState<{
    data: import("@/services/io/_common/GenericReport").GenericReport;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [integrationStatus, setIntegrationStatus] =
    useState<ContractorsWithIntegrationStatus | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "cube">("overview");
  const [selectedIterationIds, setSelectedIterationIds] = useState<number[]>([]);

  const projectsQuery = projectQueryUtils
    .withEnsureDefault({
      workspaceId,
      clientId,
    })
    (projectQueryUtils.ofDefault());
  const projectsWithActiveFilter = useMemo(
    () =>
      projectQueryUtils.transform(projectsQuery).build((q) => [
        q.withFilter("status", { operator: "oneOf", value: ["active"] }),
      ]),
    [projectsQuery],
  );

  const projectsData = services.projectService.useProjects(
    maybe.of(projectsWithActiveFilter),
  );
  const projectIds = useMemo(
    () => rd.tryMap(projectsData, (p) => p.map((x) => x.id)) ?? [],
    [projectsData],
  );

  const iterationsQuery = useMemo(
    () =>
      projectIds.length > 0
        ? projectIterationQueryUtils.getBuilder().build((q) => [
            q.withFilter("projectId", {
              operator: "oneOf",
              value: projectIds,
            }),
            q.withFilter("status", {
              operator: "oneOf",
              value: ["active", "closed"],
            }),
          ])
        : null,
    [projectIds],
  );
  const iterationsData =
    services.projectIterationService.useProjectIterations(
      maybe.of(iterationsQuery),
    );
  const allIterations = rd.tryMap(iterationsData, (x) => x) ?? [];
  const iterationsActiveFirst = useMemo(
    () =>
      [...allIterations].sort((a, b) => {
        const statusOrder = { active: 0, closed: 1, draft: 2 };
        return (
          (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2)
        );
      }),
    [allIterations],
  );

  const projectsMap = useMemo(() => {
    const map = new Map<number, { name: string }>();
    rd.tryMap(projectsData, (projects) => {
      projects.forEach((p) => map.set(p.id, { name: p.name }));
    });
    return map;
  }, [projectsData]);

  const selectedIterations = useMemo(
    () =>
      allIterations.filter((i) => selectedIterationIds.includes(i.id)),
    [allIterations, selectedIterationIds],
  );

  const iterationRange = useMemo(
    () => getDateRangeFromIterations(selectedIterations),
    [selectedIterations],
  );

  const iterationPickerItems: SimpleItem[] = useMemo(
    () =>
      iterationsActiveFirst.map((iter) => {
        const project = projectsMap.get(iter.projectId);
        const projectName =
          project?.name ?? `Project ${iter.projectId}`;
        const periodLabel = `${format(calendarDateToJSDate(iter.periodStart), "dd MMM yyyy")} – ${format(calendarDateToJSDate(iter.periodEnd), "dd MMM yyyy")}`;
        const statusLabel =
          iter.status === "active" ? " · Active" : iter.status === "closed" ? " · Closed" : "";
        return {
          id: String(iter.id),
          label: `${projectName} #${iter.ordinalNumber}${statusLabel} (${periodLabel})`,
        };
      }),
    [iterationsActiveFirst, projectsMap],
  );

  const { start, end } = useMemo(() => {
    const range = getDateRange(datePreset, iterationRange);
    if (!range) return { start: null as Date | null, end: null as Date | null };
    return { start: range.start, end: range.end };
  }, [datePreset, iterationRange]);

  const scope: TmetricDashboardCacheScope = useMemo(() => {
    const s: TmetricDashboardCacheScope = {};
    if (maybe.isPresent(workspaceId) && !idSpecUtils.isAll(workspaceId)) {
      s.workspaceIds = [workspaceId];
    }
    if (maybe.isPresent(clientId) && !idSpecUtils.isAll(clientId)) {
      s.clientIds = [clientId];
    }
    if (
      datePreset === "active_iterations" &&
      selectedIterationIds.length > 0
    ) {
      s.projectIterationIds = selectedIterationIds;
    }
    return s;
  }, [
    workspaceId,
    clientId,
    datePreset,
    selectedIterationIds,
  ]);

  const loadIntegrationStatus = useCallback(async () => {
    const status =
      await services.tmetricDashboardService.getContractorsInScopeWithIntegrationStatus(
        scope,
      );
    setIntegrationStatus(status);
  }, [services.tmetricDashboardService, scope]);

  const canLoadOrRefresh = start !== null && end !== null;

  const loadCached = useCallback(async () => {
    if (!canLoadOrRefresh) return;
    setError(null);
    const report = await services.tmetricDashboardService.getCached({
      scope,
      periodStart: start,
      periodEnd: end,
    });
    setCachedReport(report ? { data: report } : null);
  }, [services.tmetricDashboardService, scope, start, end, canLoadOrRefresh]);

  const handleRefresh = useCallback(async () => {
    if (!canLoadOrRefresh) return;
    setIsRefreshing(true);
    setError(null);
    try {
      const report = await services.tmetricDashboardService.refreshAndCache({
        scope,
        periodStart: start,
        periodEnd: end,
      });
      setCachedReport({ data: report });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsRefreshing(false);
    }
  }, [services.tmetricDashboardService, scope, start, end, canLoadOrRefresh]);

  useEffect(() => {
    if (canLoadOrRefresh) {
      loadCached();
    } else if (datePreset === "active_iterations") {
      setCachedReport(null);
    }
  }, [loadCached, canLoadOrRefresh, datePreset]);

  useEffect(() => {
    loadIntegrationStatus();
  }, [loadIntegrationStatus]);

  const contractorsSummary = cachedReport
    ? services.generatedReportViewService.getContractorsSummaryView({
        id: 0,
        createdAt: new Date(),
        projectIterationId: 0,
        data: cachedReport.data,
        originalData: null,
      })
    : null;

  const basicInfo = cachedReport
    ? services.generatedReportViewService.getBasicInformationView({
        id: 0,
        createdAt: new Date(),
        projectIterationId: 0,
        data: cachedReport.data,
        originalData: null,
      })
    : null;

  const reportAsSource = cachedReport
    ? {
        id: 0,
        createdAt: new Date(),
        projectIterationId: 0,
        data: cachedReport.data,
        originalData: null,
      }
    : null;

  const contractorIdsInReport = useMemo(() => {
    if (!cachedReport) return [];
    return [
      ...new Set(cachedReport.data.timeEntries.map((e) => e.contractorId)),
    ];
  }, [cachedReport]);

  const contractorsQuery = services.contractorService.useContractors(
    contractorQueryUtils
      .getBuilder()
      .build((q) =>
        contractorIdsInReport.length
          ? [
              q.withFilter("id", {
                operator: "oneOf",
                value: contractorIdsInReport,
              }),
            ]
          : [],
      ),
  );

  const contractorNameMap = useMemo(() => {
    const map = new Map<number, string>();
    rd.tryMap(contractorsQuery, (contractors) => {
      contractors.forEach((c) => map.set(c.id, c.fullName));
    });
    contractorIdsInReport.forEach((id) => {
      if (!map.has(id)) map.set(id, `Contractor ${id}`);
    });
    return map;
  }, [contractorsQuery, contractorIdsInReport]);

  const hasIterationScope =
    datePreset === "active_iterations" && selectedIterations.length > 0;

  const contractorIterationBreakdown = useMemo(() => {
    if (!cachedReport || !hasIterationScope) return null;
    return getContractorIterationBreakdown(
      { data: cachedReport.data },
      selectedIterations,
      projectsMap,
    );
  }, [cachedReport, hasIterationScope, selectedIterations, projectsMap]);

  const iterationSummary = useMemo(() => {
    if (!cachedReport || !hasIterationScope) return null;
    return getIterationSummary(
      { data: cachedReport.data },
      selectedIterations,
      projectsMap,
    );
  }, [cachedReport, hasIterationScope, selectedIterations, projectsMap]);

  const LANE_COLORS = [
    "bg-chart-1",
    "bg-chart-2",
    "bg-chart-3",
    "bg-chart-4",
    "bg-chart-5",
  ];

  const { timelineLanes, timelineItems } = useMemo(() => {
    if (!cachedReport)
      return {
        timelineLanes: [] as Lane[],
        timelineItems: [] as TimelineItem<unknown>[],
      };
    const report = cachedReport.data;
    const timeZone = getLocalTimeZone();

    const byContractor = new Map<number, typeof report.timeEntries>();
    report.timeEntries.forEach((entry) => {
      if (!byContractor.has(entry.contractorId)) {
        byContractor.set(entry.contractorId, []);
      }
      byContractor.get(entry.contractorId)!.push(entry);
    });

    const lanes: Lane[] = Array.from(byContractor.entries())
      .sort(([a], [b]) => a - b)
      .map(([contractorId], i) => ({
        id: String(contractorId),
        name:
          contractorNameMap.get(contractorId) ?? `Contractor ${contractorId}`,
        color: LANE_COLORS[i % LANE_COLORS.length],
      }));

    const items: TimelineItem<unknown>[] = [];
    report.timeEntries.forEach((entry, idx) => {
      const taskType = report.definitions.taskTypes[entry.taskId];
      const activityType = report.definitions.activityTypes[entry.activityId];
      const taskName = taskType?.name ?? "Unknown Task";
      const activityName = activityType?.name ?? "Unknown Activity";
      const durationH =
        (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);
      const durationLabel =
        durationH < 1
          ? `${Math.round(durationH * 60)}m`
          : `${durationH.toFixed(1)}h`;
      const label = `${taskName} · ${activityName} (${durationLabel})`;

      items.push({
        id: entry.id || `entry-${idx}`,
        laneId: String(entry.contractorId),
        start: fromAbsolute(entry.startAt.getTime(), timeZone),
        end: fromAbsolute(entry.endAt.getTime(), timeZone),
        label,
        color:
          LANE_COLORS[
            lanes.findIndex((l) => l.id === String(entry.contractorId)) %
              LANE_COLORS.length
          ],
        data: entry,
      });
    });

    return { timelineLanes: lanes, timelineItems: items };
  }, [cachedReport, contractorNameMap]);

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header + tabs row */}
      <div className="flex-shrink-0 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              TMetric Dashboard
            </h1>
            <p className="text-muted-foreground">
              Cross-workspace time tracking insights. Click Refresh to fetch
              from TMetric.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={datePreset}
              onValueChange={(v) => {
                setDatePreset(v as DateRangePreset);
                if (v !== "active_iterations") setSelectedIterationIds([]);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="custom">Last 7 days</SelectItem>
                <SelectItem value="all">Last year</SelectItem>
                <SelectItem value="active_iterations">
                  Active iterations
                </SelectItem>
              </SelectContent>
            </Select>

            {datePreset === "active_iterations" && (
              <SimpleArrayPicker
                items={iterationPickerItems}
                value={selectedIterationIds.map(String)}
                onSelect={(ids) =>
                  setSelectedIterationIds(ids.map((id) => Number(id)))
                }
                placeholder="Select iterations..."
                searchPlaceholder="Search iterations..."
                variant="outline"
                align="start"
                side="bottom"
              />
            )}

            <Button
              onClick={handleRefresh}
              disabled={isRefreshing || !canLoadOrRefresh}
              variant="default"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh from TMetric
            </Button>
            <Button
              variant="outline"
              onClick={loadCached}
              disabled={!canLoadOrRefresh}
            >
              Load cached
            </Button>
          </div>
        </div>

        {cachedReport && (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "overview" | "cube")}
          >
            <TabsList>
              <TabsTrigger value="overview">
                <TrendingUp className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="cube">
                <Grid3X3 className="h-4 w-4 mr-2" />
                Cube Explorer
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Tab content */}
      {activeTab === "cube" && reportAsSource ? (
        <div className="flex-1 min-h-0 mt-4">
          <TmetricCubeExplorer
            report={reportAsSource}
            services={services}
            className="w-full h-full min-h-0"
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-6 mt-4">
          {integrationStatus &&
            (integrationStatus.integratedContractorIds.length > 0 ||
              integrationStatus.nonIntegratedContractorIds.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Scope</CardTitle>
                  <CardDescription>
                    {integrationStatus.integratedContractorIds.length +
                      integrationStatus.nonIntegratedContractorIds.length}{" "}
                    contractor(s) in scope ·{" "}
                    {integrationStatus.integratedContractorIds.length}{" "}
                    integrated with TMetric
                    {integrationStatus.nonIntegratedContractorIds.length > 0 &&
                      ` · ${integrationStatus.nonIntegratedContractorIds.length} not integrated`}
                  </CardDescription>
                </CardHeader>
                {integrationStatus.nonIntegratedContractorIds.length > 0 && (
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UserX className="h-4 w-4 shrink-0" />
                      <span>Not integrated (excluded from refresh):</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {integrationStatus.nonIntegratedContractorIds.map(
                        (cid) => (
                          <ContractorWidget
                            key={cid}
                            contractorId={maybe.of(cid)}
                            services={services}
                            layout="full"
                            size="sm"
                            className="opacity-60"
                          />
                        ),
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6 text-destructive">
                {error}
              </CardContent>
            </Card>
          )}

          {!cachedReport && !error && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                {datePreset === "active_iterations" && !canLoadOrRefresh ? (
                  <>
                    <CalendarRange className="mb-4 h-16 w-16 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Select one or more active iterations to load TMetric data.
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Choose iterations from the dropdown above.
                    </p>
                  </>
                ) : (
                  <>
                    <BarChart3 className="mb-4 h-16 w-16 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No cached data. Click &quot;Refresh from TMetric&quot; to
                      fetch data.
                    </p>
                    {start && end && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {format(start, "dd MMM yyyy")} – {format(end, "dd MMM yyyy")}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {cachedReport && basicInfo && (
            <>
              {/* Stats + By iteration (when iteration mode) or By contractor */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Stats card: time entries + totals */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Time entries & totals
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="text-2xl font-bold">
                          {basicInfo.statistics.timeEntriesCount}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          time entries
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Total cost
                          </p>
                          <CurrencyValueWidget
                            values={basicInfo.statistics.totalCostBudget}
                            services={services}
                            exchangeService={services.exchangeService}
                            className="text-lg font-semibold"
                          />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Total billing
                          </p>
                          <CurrencyValueWidget
                            values={basicInfo.statistics.totalBillingBudget}
                            services={services}
                            exchangeService={services.exchangeService}
                            className="text-lg font-semibold"
                          />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Profit
                          </p>
                          <CurrencyValueWidget
                            values={basicInfo.statistics.totalEarningsBudget}
                            services={services}
                            exchangeService={services.exchangeService}
                            className="text-lg font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* By iteration (when iteration mode) */}
                {hasIterationScope &&
                iterationSummary &&
                iterationSummary.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>By iteration</CardTitle>
                      <CardDescription>
                        Cost, billing, and profit per iteration
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {iterationSummary.map((iter) => (
                          <div
                            key={iter.iterationId}
                            className="rounded-lg border p-3"
                          >
                            <p className="text-sm font-medium">
                              {iter.iterationLabel}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">
                                  Cost:{" "}
                                </span>
                                <CurrencyValueWidget
                                  values={iter.cost}
                                  services={services}
                                  exchangeService={services.exchangeService}
                                  className="font-medium"
                                />
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Billing:{" "}
                                </span>
                                <CurrencyValueWidget
                                  values={iter.billing}
                                  services={services}
                                  exchangeService={services.exchangeService}
                                  className="font-medium"
                                />
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Profit:{" "}
                                </span>
                                <Badge variant="secondary">
                                  <CurrencyValueWidget
                                    values={iter.profit}
                                    services={services}
                                    exchangeService={
                                      services.exchangeService
                                    }
                                    className="text-inherit"
                                  />
                                </Badge>
                              </div>
                              <span className="text-muted-foreground">
                                {iter.hours.toFixed(1)}h · {iter.entries} entries
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : contractorsSummary &&
                  contractorsSummary.contractors.length > 0 &&
                  !hasIterationScope ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>By contractor</CardTitle>
                      <CardDescription>
                        Cost, billing, and profit per contractor (integrated
                        only)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const integratedIds = new Set(
                          integrationStatus?.integratedContractorIds ?? [],
                        );
                        const displayedContractors =
                          integratedIds.size > 0
                            ? contractorsSummary.contractors.filter((c) =>
                                integratedIds.has(c.contractorId),
                              )
                            : contractorsSummary.contractors;
                        const excludedCount =
                          contractorsSummary.contractors.length -
                          displayedContractors.length;

                        return (
                          <>
                            {excludedCount > 0 && (
                              <p className="mb-4 text-sm text-muted-foreground">
                                {excludedCount} contractor(s) in cached data are
                                no longer integrated and excluded from this
                                view. Totals above include their data.
                              </p>
                            )}
                            <div className="space-y-4">
                              {displayedContractors.map((c) => (
                                <div
                                  key={c.contractorId}
                                  className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <ContractorWidget
                                    contractorId={maybe.of(c.contractorId)}
                                    services={services}
                                    layout="full"
                                    size="sm"
                                  />
                                  <div className="flex flex-wrap gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">
                                        Cost:{" "}
                                      </span>
                                      <CurrencyValueWidget
                                        values={c.costBudget}
                                        services={services}
                                        exchangeService={
                                          services.exchangeService
                                        }
                                        className="font-medium"
                                      />
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">
                                        Billing:{" "}
                                      </span>
                                      <CurrencyValueWidget
                                        values={c.billingBudget}
                                        services={services}
                                        exchangeService={
                                          services.exchangeService
                                        }
                                        className="font-medium"
                                      />
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">
                                        Profit:{" "}
                                      </span>
                                      <Badge variant="secondary">
                                        <CurrencyValueWidget
                                          values={c.earningsBudget}
                                          services={services}
                                          exchangeService={
                                            services.exchangeService
                                          }
                                          className="text-inherit"
                                        />
                                      </Badge>
                                    </div>
                                    <span className="text-muted-foreground">
                                      {c.totalHours.toFixed(1)}h ·{" "}
                                      {c.entriesCount} entries
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                ) : !hasIterationScope ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>By contractor</CardTitle>
                      <CardDescription>
                        No contractors in cached data
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : null}
              </div>

              {/* Charts row */}
              <div className="grid gap-4 md:grid-cols-2">
                {hasIterationScope &&
                  iterationSummary &&
                  iterationSummary.length > 0 && (
                    <TmetricIterationBarChart
                      iterationSummary={iterationSummary}
                      services={services}
                    />
                  )}
                {contractorIterationBreakdown &&
                  contractorIterationBreakdown.length > 0 && (
                    <TmetricHoursPieChart
                      contractorBreakdown={contractorIterationBreakdown}
                      contractorNameMap={contractorNameMap}
                    />
                  )}
                {!hasIterationScope &&
                  contractorsSummary &&
                  contractorsSummary.contractors.length > 0 && (
                    <TmetricHoursPieChart
                      contractorBreakdown={contractorsSummary.contractors.map(
                        (c) => ({
                          contractorId: c.contractorId,
                          total: {
                            cost: c.costBudget,
                            billing: c.billingBudget,
                            profit: c.earningsBudget,
                            hours: c.totalHours,
                            entries: c.entriesCount,
                          },
                          byIteration: [],
                        }),
                      )}
                      contractorNameMap={contractorNameMap}
                    />
                  )}
              </div>

              {/* By contractor with iteration breakdown (when iteration mode) */}
              {hasIterationScope && contractorIterationBreakdown &&
              contractorIterationBreakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>By contractor</CardTitle>
                    <CardDescription>
                      Cost, billing, and profit per contractor with breakdown by
                      iteration (integrated only)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const integratedIds = new Set(
                        integrationStatus?.integratedContractorIds ?? [],
                      );
                      const displayed =
                        integratedIds.size > 0
                          ? contractorIterationBreakdown.filter((c) =>
                              integratedIds.has(c.contractorId),
                            )
                          : contractorIterationBreakdown;
                      const excludedCount =
                        contractorIterationBreakdown.length - displayed.length;

                      return (
                        <>
                          {excludedCount > 0 && (
                            <p className="mb-4 text-sm text-muted-foreground">
                              {excludedCount} contractor(s) in cached data are
                              no longer integrated and excluded from this view.
                            </p>
                          )}
                          <div className="space-y-2">
                            {displayed.map((c) => (
                              <ContractorWithIterationBreakdown
                                key={c.contractorId}
                                contractorId={c.contractorId}
                                total={c.total}
                                byIteration={c.byIteration}
                                services={services}
                              />
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

          {/* Timeline */}
              {reportAsSource && timelineItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tasks over time</CardTitle>
                    <CardDescription>
                      Timeline view of time entries
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-[400px] rounded-md overflow-hidden border border-border">
                      <InfiniteTimeline
                        items={timelineItems}
                        lanes={timelineLanes}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
