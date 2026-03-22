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
import type { TimelineItem } from "@/platform/passionware-timeline/passionware-timeline-core";
import type { Lane } from "@/platform/passionware-timeline/timeline-lane-tree";
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
  | "unscoped"
  | "custom";

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

/**
 * Intersection of two date ranges (common range). Returns null if they do not overlap.
 */
export function intersectDateRanges(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date },
): { start: Date; end: Date } | null {
  const start = Math.max(a.start.getTime(), b.start.getTime());
  const end = Math.min(a.end.getTime(), b.end.getTime());
  if (start > end) return null;
  return { start: new Date(start), end: new Date(end) };
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

/** Sum multiple CurrencyValue[] arrays into one (amounts summed by currency). */
export function sumCurrencyValues(
  ...arrays: CurrencyValue[][]
): CurrencyValue[] {
  const byCurrency: Record<string, number> = {};
  for (const arr of arrays) {
    for (const { amount, currency } of arr) {
      byCurrency[currency] = (byCurrency[currency] ?? 0) + amount;
    }
  }
  return Object.entries(byCurrency).map(([currency, amount]) => ({
    amount,
    currency,
  }));
}

/** Divide each amount by divisor (e.g. for weighted average rate = total / hours). */
export function divideCurrencyValues(
  values: CurrencyValue[],
  divisor: number,
): CurrencyValue[] {
  if (divisor <= 0) return values.map((v) => ({ ...v, amount: 0 }));
  return values.map((v) => ({
    ...v,
    amount: v.amount / divisor,
  }));
}

/**
 * Sum amounts in `values` after converting each to `targetCurrency` using `rateMap`.
 * Used to compute profit in a single currency when cost and billing may be in different currencies.
 * Rate map key format: `${fromCurrency.toUpperCase()}->${toCurrency.toUpperCase()}`.
 */
export function sumCurrencyValuesInTarget(
  values: CurrencyValue[],
  rateMap: Map<string, number>,
  targetCurrency: string,
): number {
  const target = targetCurrency.toUpperCase();
  return values.reduce((sum, v) => {
    const from = v.currency.toUpperCase();
    const key = `${from}->${target}`;
    const rate = from === target ? 1 : rateMap.get(key) ?? 0;
    return sum + v.amount * rate;
  }, 0);
}

// --- Scope hierarchy and contractor rates (from iteration/range scope + report) ---

export interface ContractorRateInProject {
  contractorId: number;
  costRate: number;
  costCurrency: string;
  billingRate: number;
  billingCurrency: string;
}

/** Per-contractor totals and rates for an iteration (from report time entries). */
export interface ContractorIterationTotals {
  contractorId: number;
  costRate: number;
  costCurrency: string;
  billingRate: number;
  billingCurrency: string;
  /** Weighted average cost rate (totalCost / hours). */
  avgCostRate: number;
  /** Weighted average billing rate (totalBilling / hours). */
  avgBillingRate: number;
  totalCost: number;
  totalBilling: number;
  totalProfit: number;
  hours: number;
  entriesCount: number;
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
 * Per-contractor totals and rates for an iteration: sums time entries by contractor,
 * returns hourly rates, weighted average rates (total/hours), and totals.
 */
export function getContractorIterationTotals(
  report: GenericReport,
  iterationId: number,
): ContractorIterationTotals[] {
  const byContractor = new Map<
    number,
    {
      costRate: number;
      costCurrency: string;
      billingRate: number;
      billingCurrency: string;
      totalCost: number;
      totalBilling: number;
      hours: number;
      entriesCount: number;
    }
  >();

  for (const entry of report.timeEntries) {
    if (getIterationIdFromRoleKey(entry.roleId) !== iterationId) continue;
    const contractorId = getContractorIdFromRoleKey(entry.roleId);
    if (contractorId == null) continue;
    let rate: RoleRate;
    try {
      rate = getMatchingRate(report, entry);
    } catch {
      continue;
    }
    const hours =
      (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);
    const cost = hours * rate.costRate;
    const billing = hours * rate.billingRate;

    if (!byContractor.has(contractorId)) {
      byContractor.set(contractorId, {
        costRate: rate.costRate,
        costCurrency: rate.costCurrency,
        billingRate: rate.billingRate,
        billingCurrency: rate.billingCurrency,
        totalCost: 0,
        totalBilling: 0,
        hours: 0,
        entriesCount: 0,
      });
    }
    const row = byContractor.get(contractorId)!;
    row.totalCost += cost;
    row.totalBilling += billing;
    row.hours += hours;
    row.entriesCount += 1;
  }

  return Array.from(byContractor.entries()).map(
    ([contractorId, row]) => ({
      contractorId,
      costRate: row.costRate,
      costCurrency: row.costCurrency,
      billingRate: row.billingRate,
      billingCurrency: row.billingCurrency,
      avgCostRate: row.hours > 0 ? row.totalCost / row.hours : row.costRate,
      avgBillingRate: row.hours > 0 ? row.totalBilling / row.hours : row.billingRate,
      totalCost: row.totalCost,
      totalBilling: row.totalBilling,
      totalProfit: row.totalBilling - row.totalCost,
      hours: row.hours,
      entriesCount: row.entriesCount,
    }),
  );
}

/**
 * Contractor summary compatible with ContractorsSummaryView.contractors,
 * scoped to the given iterations (same roleId-based logic as TmetricScopeHierarchyPanel).
 */
export interface ContractorsSummaryScoped {
  contractors: Array<{
    contractorId: number;
    entriesCount: number;
    totalHours: number;
    costBudget: CurrencyValue[];
    billingBudget: CurrencyValue[];
    earningsBudget: CurrencyValue[];
  }>;
}

/**
 * Build contractor summary from report using only entries whose roleId encodes
 * an iteration in the given list. Matches TmetricScopeHierarchyPanel / getScopeHierarchyTotals logic.
 */
export function getContractorsSummaryScopedToIterations(
  report: GenericReport,
  iterationIds: number[],
): ContractorsSummaryScoped {
  const byContractor = new Map<
    number,
    {
      cost: Record<string, number>;
      billing: Record<string, number>;
      profit: Record<string, number>;
      hours: number;
      entriesCount: number;
    }
  >();

  for (const iterId of iterationIds) {
    const totals = getContractorIterationTotals(report, iterId);
    for (const row of totals) {
      if (!byContractor.has(row.contractorId)) {
        byContractor.set(row.contractorId, {
          cost: {},
          billing: {},
          profit: {},
          hours: 0,
          entriesCount: 0,
        });
      }
      const c = byContractor.get(row.contractorId)!;
      addToBudget(c.cost, row.totalCost, row.costCurrency);
      addToBudget(c.billing, row.totalBilling, row.billingCurrency);
      addToBudget(c.profit, row.totalBilling, row.billingCurrency);
      addToBudget(c.profit, -row.totalCost, row.costCurrency);
      c.hours += row.hours;
      c.entriesCount += row.entriesCount;
    }
  }

  const contractors = Array.from(byContractor.entries()).map(
    ([contractorId, row]) => ({
      contractorId,
      entriesCount: row.entriesCount,
      totalHours: row.hours,
      costBudget: budgetToCurrencyValues(row.cost),
      billingBudget: budgetToCurrencyValues(row.billing),
      earningsBudget: budgetToCurrencyValues(row.profit),
    }),
  );

  return { contractors };
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

export interface ScopeHierarchyTotals {
  byClient: Map<
    number,
    {
      cost: CurrencyValue[];
      billing: CurrencyValue[];
      profit: CurrencyValue[];
      hours: number;
    }
  >;
  byIteration: Map<
    number,
    {
      cost: CurrencyValue[];
      billing: CurrencyValue[];
      profit: CurrencyValue[];
      hours: number;
    }
  >;
}

/**
 * Cumulative billing per calendar day for one iteration from report time entries.
 * Returns one row per day in [periodStart, periodEnd] with cumulative sum (in iteration currency) up to end of that day.
 * Used to regenerate budget target log with daily snapshots from TMetric data.
 */
export function getCumulativeBillingByDay(
  report: GenericReport,
  iterationId: number,
  periodStart: Date,
  periodEnd: Date,
  iterationCurrency: string,
  rateMap: Map<string, number>,
): Array<{ date: Date; cumulativeBilling: number }> {
  const dayBuckets = new Map<number, number>();
  for (const entry of report.timeEntries) {
    if (getIterationIdFromRoleKey(entry.roleId) !== iterationId) continue;
    let rate: RoleRate;
    try {
      rate = getMatchingRate(report, entry);
    } catch {
      continue;
    }
    const hours =
      (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);
    const billing = hours * rate.billingRate;
    const inIter = sumCurrencyValuesInTarget(
      [{ amount: billing, currency: rate.billingCurrency }],
      rateMap,
      iterationCurrency,
    );
    const dayStart = startOfDay(entry.startAt).getTime();
    dayBuckets.set(dayStart, (dayBuckets.get(dayStart) ?? 0) + inIter);
  }
  const startTs = startOfDay(periodStart).getTime();
  const endTs = endOfDay(periodEnd).getTime();
  const days: number[] = [];
  for (let t = startTs; t <= endTs; t += 24 * 60 * 60 * 1000) {
    days.push(t);
  }
  let cumulative = 0;
  return days.map((dayStart) => {
    cumulative += dayBuckets.get(dayStart) ?? 0;
    return {
      date: endOfDay(new Date(dayStart)),
      cumulativeBilling: cumulative,
    };
  });
}

/** Collect all billing currencies from report role types. */
export function getReportBillingCurrencies(
  report: GenericReport,
): Set<string> {
  const set = new Set<string>();
  for (const role of Object.values(report.definitions.roleTypes)) {
    for (const r of role.rates) {
      set.add(r.billingCurrency);
    }
  }
  return set;
}

/**
 * Billing totals per iteration from report time entries (by iteration id only).
 * Used e.g. to log billing-only budget trigger snapshots after TMetric refresh.
 */
export function getBillingByIteration(
  report: GenericReport,
  iterationIds: Set<number>,
): Map<number, CurrencyValue[]> {
  const byIteration = new Map<
    number,
    { billing: Record<string, number> }
  >();
  const ensureMap = (iterId: number) => {
    if (!byIteration.has(iterId)) {
      byIteration.set(iterId, { billing: {} });
    }
  };
  for (const entry of report.timeEntries) {
    const iterationId = getIterationIdFromRoleKey(entry.roleId);
    if (iterationId == null || !iterationIds.has(iterationId)) continue;
    let matchingRate: RoleRate;
    try {
      matchingRate = getMatchingRate(report, entry);
    } catch {
      continue;
    }
    const hours =
      (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);
    const billing = hours * matchingRate.billingRate;
    ensureMap(iterationId);
    addToBudget(byIteration.get(iterationId)!.billing, billing, matchingRate.billingCurrency);
  }
  return new Map(
    Array.from(byIteration.entries()).map(([id, rec]) => [
      id,
      budgetToCurrencyValues(rec.billing),
    ]),
  );
}

/**
 * Computes total cost, billing, and profit per client and per iteration from report time entries.
 * Uses roleId (iter_XX_contractor_YY) to assign entries to iterations; clients from scope hierarchy.
 */
export function getScopeHierarchyTotals(
  report: GenericReport,
  scopeHierarchy: ScopeHierarchyClient[],
): ScopeHierarchyTotals {
  const iterationIdToClientId = new Map<number, number>();
  for (const client of scopeHierarchy) {
    for (const row of client.iterations) {
      iterationIdToClientId.set(row.iteration.id, client.clientId);
    }
  }

  const byIteration = new Map<
    number,
    {
      cost: Record<string, number>;
      billing: Record<string, number>;
      profit: Record<string, number>;
      hours: number;
    }
  >();
  const byClient = new Map<
    number,
    {
      cost: Record<string, number>;
      billing: Record<string, number>;
      profit: Record<string, number>;
      hours: number;
    }
  >();

  const ensureMaps = (iterId: number, cid: number) => {
    if (!byIteration.has(iterId)) {
      byIteration.set(iterId, {
        cost: {},
        billing: {},
        profit: {},
        hours: 0,
      });
    }
    if (!byClient.has(cid)) {
      byClient.set(cid, {
        cost: {},
        billing: {},
        profit: {},
        hours: 0,
      });
    }
  };

  for (const entry of report.timeEntries) {
    const iterationId = getIterationIdFromRoleKey(entry.roleId);
    if (iterationId == null) continue;
    const clientId = iterationIdToClientId.get(iterationId);
    if (clientId == null) continue;
    let matchingRate: RoleRate;
    try {
      matchingRate = getMatchingRate(report, entry);
    } catch {
      continue;
    }
    const hours =
      (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);
    const cost = hours * matchingRate.costRate;
    const billing = hours * matchingRate.billingRate;

    ensureMaps(iterationId, clientId);
    const iMap = byIteration.get(iterationId)!;
    const cMap = byClient.get(clientId)!;
    iMap.hours += hours;
    cMap.hours += hours;
    addToBudget(iMap.cost, cost, matchingRate.costCurrency);
    addToBudget(iMap.billing, billing, matchingRate.billingCurrency);
    addToBudget(iMap.profit, billing, matchingRate.billingCurrency);
    addToBudget(iMap.profit, -cost, matchingRate.costCurrency);
    addToBudget(cMap.cost, cost, matchingRate.costCurrency);
    addToBudget(cMap.billing, billing, matchingRate.billingCurrency);
    addToBudget(cMap.profit, billing, matchingRate.billingCurrency);
    addToBudget(cMap.profit, -cost, matchingRate.costCurrency);
  }

  return {
    byClient: new Map(
      Array.from(byClient.entries()).map(([cid, rec]) => [
        cid,
        {
          cost: budgetToCurrencyValues(rec.cost),
          billing: budgetToCurrencyValues(rec.billing),
          profit: budgetToCurrencyValues(rec.profit),
          hours: rec.hours,
        },
      ]),
    ),
    byIteration: new Map(
      Array.from(byIteration.entries()).map(([id, rec]) => [
        id,
        {
          cost: budgetToCurrencyValues(rec.cost),
          billing: budgetToCurrencyValues(rec.billing),
          profit: budgetToCurrencyValues(rec.profit),
          hours: rec.hours,
        },
      ]),
    ),
  };
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

/**
 * Contractor breakdown by iteration using roleId for assignment (same as
 * TmetricScopeHierarchyPanel / getContractorIterationTotals). Only entries whose
 * roleId encodes an iteration in the given scope are included; date range filters
 * which entries count.
 */
export function getContractorIterationBreakdown(
  report: { data: GenericReport },
  iterations: ProjectIteration[],
  projectsMap: Map<number, { name: string }>,
  rangeStart: Date,
  rangeEnd: Date,
): ContractorIterationBreakdown[] {
  const scopeIterationIds = new Set(iterations.map((i) => i.id));
  const iterationLabels = new Map(
    iterations.map((i) => [
      i.id,
      `${projectsMap.get(i.projectId)?.name ?? `Project ${i.projectId}`} #${i.ordinalNumber}`,
    ]),
  );

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
    const iterationId = getIterationIdFromRoleKey(entry.roleId);
    if (iterationId == null || !scopeIterationIds.has(iterationId)) continue;

    const entryStartMs = entry.startAt.getTime();
    const entryEndMs = entry.endAt.getTime();
    if (entryStartMs > rangeEndMs || entryEndMs < rangeStartMs) continue;

    const contractorId = getContractorIdFromRoleKey(entry.roleId);
    if (contractorId == null) continue;

    let matchingRate: RoleRate;
    try {
      matchingRate = getMatchingRate(report.data, entry);
    } catch {
      continue;
    }

    const hours =
      (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);
    const cost = hours * matchingRate.costRate;
    const billing = hours * matchingRate.billingRate;

    if (!byContractor.has(contractorId)) {
      byContractor.set(contractorId, {
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
    const c = byContractor.get(contractorId)!;

    addToBudget(c.total.cost, cost, matchingRate.costCurrency);
    addToBudget(c.total.billing, billing, matchingRate.billingCurrency);
    addToBudget(c.total.profit, billing, matchingRate.billingCurrency);
    addToBudget(c.total.profit, -cost, matchingRate.costCurrency);
    c.total.hours += hours;
    c.total.entries += 1;

    if (!c.byIteration.has(iterationId)) {
      c.byIteration.set(iterationId, {
        cost: {},
        billing: {},
        profit: {},
        hours: 0,
        entries: 0,
      });
    }
    const iter = c.byIteration.get(iterationId)!;
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
            iterationLabels.get(iterationId) ?? `Iteration ${iterationId}`,
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
  report: { data: GenericReport },
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
  customRange?: { start: Date; end: Date } | null,
): { start: Date; end: Date } | null {
  if (preset === "custom" && customRange) {
    return customRange;
  }
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
  report: { data: GenericReport },
  contractorNameMap: Map<number, string>,
): {
  lanes: Lane[];
  items: TimelineItem<unknown>[];
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

  const items: TimelineItem<unknown>[] = [];
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
