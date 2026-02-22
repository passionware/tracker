import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api";
import type { Project } from "@/api/project/project.api";
import { getMatchingRate } from "@/services/io/_common/getMatchingRate";
import { calendarDateToJSDate } from "@/platform/lang/internationalized-date";
import type { CurrencyValue } from "@/services/ExchangeService/ExchangeService";
import type {
  GenericReport,
  RoleRate,
} from "@/services/io/_common/GenericReport";
import {
  getContractorIdFromRoleKey,
  getIterationIdFromRoleKey,
} from "@/services/io/_common/roleKeyUtils";
import { fromAbsolute, getLocalTimeZone } from "@internationalized/date";
import { rd, type RemoteData } from "@passionware/monads";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subWeeks,
} from "date-fns";

/**
 * TMetric Dashboard: process from iteration/range scope to data
 * ============================================================
 *
 * 1. INPUTS (from page/API)
 *    - workspaceId, clientId, selectedIterationIds, timePreset
 *    - projectsData (RemoteData<Project[]>), iterationsData (ProjectIteration[])
 *
 * 2. SCOPE RESOLUTION (pure, in this file)
 *    - projectsMap = from projectsData (id → name)
 *    - iterationsForScope = selectedIterationIds.length ? selected : all active
 *    - iterationRange = getDateRangeFromIterations(iterationsForScope)
 *    - { start, end } = getDateRangeForPreset(timePreset, iterationRange)
 *    - scope = { workspaceIds?, clientIds?, projectIterationIds }
 *
 * 3. LOAD REPORT (async, in TmetricDashboardService)
 *    - useCached(scope, start, end) / refreshAndCache(scope, start, end)
 *    - Returns GenericReport: timeEntries, definitions.projectTypes, definitions.roleTypes (rates)
 *
 * 4. DERIVED FROM REPORT + SCOPE (pure, in this file)
 *    - iterationsForBreakdown = iterationsOverlappingRange(iterationsForScope, start, end)
 *    - iterationSummary = getIterationSummary(report, iterationsForBreakdown, projectsMap, start, end)
 *    - contractorIterationBreakdown = getContractorIterationBreakdown(...)
 *    - scopeHierarchy = buildScopeHierarchy(projectsData, iterationsForScope, projectsMap)
 *    - scopeHierarchyWithRates = scopeHierarchy + getContractorRatesForIterationProject(report, iterationId, projectId) per row
 *    - entries: filtered timeEntries in [start,end]; rates from report.definitions.roleTypes
 */
export type TimePreset =
  | "today"
  | "this_week"
  | "last_week"
  | "month"
  | "unscoped";

export interface ContractorIterationBreakdown {
  contractorId: number;
  total: {
    cost: CurrencyValue[];
    billing: CurrencyValue[];
    profit: CurrencyValue[];
    hours: number;
    entries: number;
  };
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

export interface IterationSummary {
  iterationId: number;
  iterationLabel: string;
  cost: CurrencyValue[];
  billing: CurrencyValue[];
  profit: CurrencyValue[];
  hours: number;
  entries: number;
}

export function getDateRangeFromIterations(
  iterations: ProjectIteration[],
): { start: Date; end: Date } | null {
  if (iterations.length === 0) return null;
  const starts = iterations.map((i) =>
    calendarDateToJSDate(i.periodStart).getTime(),
  );
  const ends = iterations.map((i) =>
    endOfDay(calendarDateToJSDate(i.periodEnd)).getTime(),
  );
  return {
    start: new Date(Math.min(...starts)),
    end: new Date(Math.max(...ends)),
  };
}

export function iterationsOverlappingRange(
  iterations: ProjectIteration[],
  rangeStart: Date,
  rangeEnd: Date,
): ProjectIteration[] {
  const startMs = rangeStart.getTime();
  const endMs = rangeEnd.getTime();
  return iterations.filter((i) => {
    const iterStart = calendarDateToJSDate(i.periodStart).getTime();
    const iterEnd = endOfDay(calendarDateToJSDate(i.periodEnd)).getTime();
    return iterStart <= endMs && iterEnd >= startMs;
  });
}

export function addToBudget(
  acc: Record<string, number>,
  amount: number,
  currency: string,
): void {
  if (!acc[currency]) acc[currency] = 0;
  acc[currency] += amount;
}

export function budgetToCurrencyValues(
  byCurrency: Record<string, number>,
): CurrencyValue[] {
  return Object.entries(byCurrency).map(([currency, amount]) => ({
    amount,
    currency,
  }));
}

// --- Scope hierarchy and contractor rates (from iteration/range scope + report) ---

export interface ContractorRateInProject {
  contractorId: number;
  costRate: number;
  costCurrency: string;
  billingRate: number;
  billingCurrency: string;
}

export interface ScopeHierarchyIterationRow {
  iteration: ProjectIteration;
  iterationLabel: string;
  projectName: string;
}

export interface ScopeHierarchyClient {
  clientId: number;
  iterations: ScopeHierarchyIterationRow[];
}

/** Resolve report project type id by project name (e.g. for matching rates). */
export function findReportProjectIdByName(
  report: GenericReport,
  projectName: string,
): string | null {
  const normalized = projectName.trim().toLowerCase();
  const entry = Object.entries(report.definitions.projectTypes).find(
    ([, pt]) => pt.name.trim().toLowerCase() === normalized,
  );
  return entry ? entry[0] : null;
}

/**
 * Resolve report project type id by iteration + project (from project type parameters).
 * Uses parameters.iterationId/iterationIds and parameters.projectId so lookup does not rely on project name.
 */
export function findReportProjectIdByIterationAndProject(
  report: GenericReport,
  iterationId: number,
  projectId: number,
): string | null {
  const entry = Object.entries(report.definitions.projectTypes).find(
    ([, pt]) => {
      const params = pt.parameters ?? {};
      const matchesProject =
        (params.projectId as number | undefined) === projectId;
      const matchesIteration =
        (params.iterationIds as number[] | undefined)?.includes(iterationId) ||
        (params.iterationId as number | undefined) === iterationId;
      return matchesProject && matchesIteration;
    },
  );
  return entry ? entry[0] : null;
}

/** Get the best matching rate for a project: project-specific first, then default (empty projectIds). */
export function getBestRateForProject(
  rates: RoleRate[],
  reportProjectId: string | null,
): RoleRate | null {
  if (rates.length === 0) return null;
  const withProject = rates.filter(
    (r) =>
      r.projectIds.length > 0 &&
      reportProjectId != null &&
      r.projectIds.includes(reportProjectId),
  );
  const fallback = rates.filter((r) => r.projectIds.length === 0);
  return withProject[0] ?? fallback[0] ?? null;
}

/**
 * Returns contractor rates applicable to the given project in the report (by project name).
 * Prefer getContractorRatesForIterationProject when iterationId and projectId are available.
 */
export function getContractorRatesForProject(
  report: GenericReport,
  projectName: string,
): ContractorRateInProject[] {
  const reportProjectId = findReportProjectIdByName(report, projectName);
  const result: ContractorRateInProject[] = [];
  for (const [roleKey, roleType] of Object.entries(
    report.definitions.roleTypes,
  )) {
    const contractorId = getContractorIdFromRoleKey(roleKey);
    if (contractorId == null) continue;
    const rate = getBestRateForProject(roleType.rates, reportProjectId);
    if (!rate) continue;
    result.push({
      contractorId,
      costRate: rate.costRate,
      costCurrency: rate.costCurrency,
      billingRate: rate.billingRate,
      billingCurrency: rate.billingCurrency,
    });
  }
  return result;
}

/**
 * Returns contractor rates for a specific iteration+project using report structure:
 * - Finds report project by parameters.iterationId/iterationIds and parameters.projectId
 * - Only considers role keys iter_${iterationId}_contractor_* for that iteration
 * Does not rely on project name.
 */
export function getContractorRatesForIterationProject(
  report: GenericReport,
  iterationId: number,
  projectId: number,
): ContractorRateInProject[] {
  const reportProjectId = findReportProjectIdByIterationAndProject(
    report,
    iterationId,
    projectId,
  );
  if (reportProjectId == null) return [];
  const result: ContractorRateInProject[] = [];
  for (const [roleKey, roleType] of Object.entries(
    report.definitions.roleTypes,
  )) {
    if (getIterationIdFromRoleKey(roleKey) !== iterationId) continue;
    const contractorId = getContractorIdFromRoleKey(roleKey);
    if (contractorId == null) continue;
    const rate = getBestRateForProject(roleType.rates, reportProjectId);
    if (!rate) continue;
    result.push({
      contractorId,
      costRate: rate.costRate,
      costCurrency: rate.costCurrency,
      billingRate: rate.billingRate,
      billingCurrency: rate.billingCurrency,
    });
  }
  return result;
}

/**
 * Build scope hierarchy: clients → iterations (with project name and labels).
 * Used to display scope and to attach contractor rates per project when report is loaded.
 */
export function buildScopeHierarchy(
  projectsData: RemoteData<Project[]>,
  iterationsForScope: ProjectIteration[],
  projectsMap: Map<number, { name: string }>,
): ScopeHierarchyClient[] {
  const projects: Project[] = rd.tryMap(projectsData, (x) => x) ?? [];
  const clientIds = [
    ...new Set(
      iterationsForScope.flatMap((i) => {
        const p = projects.find((proj) => proj.id === i.projectId);
        return p ? [p.clientId] : [];
      }),
    ),
  ];
  return clientIds.map((cid) => {
    const clientProjects = projects.filter((p) => p.clientId === cid);
    const projectIds = new Set(clientProjects.map((p) => p.id));
    const iters = iterationsForScope.filter((i) => projectIds.has(i.projectId));
    return {
      clientId: cid,
      iterations: iters.map((iter) => {
        const project = projectsMap.get(iter.projectId);
        const projectName = project?.name ?? `Project ${iter.projectId}`;
        const periodLabel = `${format(calendarDateToJSDate(iter.periodStart), "dd MMM yyyy")} – ${format(calendarDateToJSDate(iter.periodEnd), "dd MMM yyyy")}`;
        const statusLabel =
          iter.status === "active"
            ? " · Active"
            : iter.status === "closed"
              ? " · Closed"
              : "";
        return {
          iteration: iter,
          iterationLabel: `${projectName} #${iter.ordinalNumber}${statusLabel} (${periodLabel})`,
          projectName,
        };
      }),
    };
  });
}

export function projectKey(iterationId: number, projectName: string): string {
  return `${iterationId}-${projectName}`;
}

// --- Entry-to-iteration matching and breakdowns ---

export function findMatchingIteration(
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
): (typeof iterationPeriods)[0] | null {
  const entryStart = entry.startAt.getTime();
  const entryProjectName = getEntryProjectName(entry.projectId)?.toLowerCase();

  const matching = iterationPeriods.filter(
    (p) => entryStart >= p.start && entryStart <= p.end,
  );
  if (matching.length === 0) return null;

  if (matching.length === 1) return matching[0];

  const byProject = entryProjectName
    ? matching.find((p) => p.projectName.toLowerCase() === entryProjectName)
    : null;
  if (byProject) return byProject;

  matching.sort((a, b) => a.end - a.start - (b.end - b.start));
  return matching[0];
}

export function getContractorIterationBreakdown(
  report: { data: import("@/services/io/_common/GenericReport").GenericReport },
  iterations: ProjectIteration[],
  projectsMap: Map<number, { name: string }>,
  rangeStart: Date,
  rangeEnd: Date,
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

  const rangeStartMs = rangeStart.getTime();
  const rangeEndMs = rangeEnd.getTime();

  for (const entry of report.data.timeEntries) {
    const entryStartMs = entry.startAt.getTime();
    const entryEndMs = entry.endAt.getTime();
    if (entryStartMs > rangeEndMs || entryEndMs < rangeStartMs) continue;

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
              : (iterationPeriods.find((p) => p.id === iterationId)?.label ??
                `Iteration ${iterationId}`),
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

export function getIterationSummary(
  report: { data: import("@/services/io/_common/GenericReport").GenericReport },
  iterations: ProjectIteration[],
  projectsMap: Map<number, { name: string }>,
  rangeStart: Date,
  rangeEnd: Date,
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

  const rangeStartMs = rangeStart.getTime();
  const rangeEndMs = rangeEnd.getTime();

  for (const entry of report.data.timeEntries) {
    const entryStartMs = entry.startAt.getTime();
    const entryEndMs = entry.endAt.getTime();
    if (entryStartMs > rangeEndMs || entryEndMs < rangeStartMs) continue;

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

export function getDateRangeForPreset(
  preset: TimePreset,
  iterationRange?: { start: Date; end: Date } | null,
): { start: Date; end: Date } | null {
  if (preset === "unscoped") {
    return iterationRange ?? null;
  }
  const now = new Date();
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "this_week":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case "last_week": {
      const lastWeekStart = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1);
      return {
        start: lastWeekStart,
        end: endOfWeek(lastWeekStart, { weekStartsOn: 1 }),
      };
    }
    case "month":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
}

const TIMELINE_LANE_COLORS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
];

export function buildTimelineFromReport(
  report: { data: import("@/services/io/_common/GenericReport").GenericReport },
  contractorNameMap: Map<number, string>,
): {
  lanes: import("@/platform/passionware-timeline").Lane[];
  items: import("@/platform/passionware-timeline").TimelineItem<unknown>[];
} {
  const reportData = report.data;
  const timeZone = getLocalTimeZone();

  const byContractor = new Map<
    number,
    (typeof reportData.timeEntries)[number][]
  >();
  reportData.timeEntries.forEach((entry) => {
    if (!byContractor.has(entry.contractorId)) {
      byContractor.set(entry.contractorId, []);
    }
    byContractor.get(entry.contractorId)!.push(entry);
  });

  const lanes = Array.from(byContractor.entries())
    .sort(([a], [b]) => a - b)
    .map(([contractorId], i) => ({
      id: String(contractorId),
      name: contractorNameMap.get(contractorId) ?? `Contractor ${contractorId}`,
      color: TIMELINE_LANE_COLORS[i % TIMELINE_LANE_COLORS.length],
    }));

  const items: import("@/platform/passionware-timeline").TimelineItem<unknown>[] =
    [];
  reportData.timeEntries.forEach((entry, idx) => {
    const taskType = reportData.definitions.taskTypes[entry.taskId];
    const activityType = reportData.definitions.activityTypes[entry.activityId];
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
        TIMELINE_LANE_COLORS[
          lanes.findIndex((l) => l.id === String(entry.contractorId)) %
            TIMELINE_LANE_COLORS.length
        ],
      data: entry,
    });
  });

  return { lanes, items };
}
