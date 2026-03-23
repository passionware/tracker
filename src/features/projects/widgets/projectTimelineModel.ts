import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import type { Project } from "@/api/project/project.api.ts";
import type { Report } from "@/api/reports/reports.api.ts";
import type { Lane } from "@/platform/passionware-timeline/timeline-lane-tree.ts";
import type {
  TimelineItem,
  TimelineTemporal,
} from "@/platform/passionware-timeline/passionware-timeline-core.ts";
import {
  CalendarDate,
  getLocalTimeZone,
  toCalendarDate,
  toZoned,
  type ZonedDateTime,
} from "@internationalized/date";

const LANE_PALETTE = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
] as const;

/** Min track height for the iteration budget chart sublane (px). */
export const PROJECT_TIMELINE_ITERATION_BUDGET_LANE_MIN_HEIGHT_PX = 152;

export type ProjectTimelineGroupBy = "client" | "project";

/** Lane `meta` for projects timeline (draw-to-create, grouping context). */
export type ProjectTimelineLaneMeta = {
  clientId?: number;
  projectId?: number;
};

export type ProjectTimelineItemData =
  | {
      kind: "iteration";
      iterationId: ProjectIteration["id"];
      projectId: Project["id"];
      /** Semantic calendar period for tooltips (same as timeline `start`/`end` when using `CalendarDate`). */
      periodStart: CalendarDate;
      periodEnd: CalendarDate;
      /** Same as timeline bar before optional generated-report billing suffix (for tooltips). */
      summaryLabel: string;
      /** Pre-formatted `totalBillingBudget` from the newest generated report for this iteration (by `createdAt`). */
      latestGeneratedReportBillingLabel?: string;
    }
  | {
      kind: "iteration-budget";
      iterationId: ProjectIteration["id"];
      projectId: Project["id"];
      periodStart: CalendarDate;
      periodEnd: CalendarDate;
      currency: string;
    }
  | {
      kind: "report";
      reportId: number;
      netValue: number;
      currency: string;
      quantity: number | null;
      unit: string | null;
      unitPrice: number | null;
      periodStart: CalendarDate;
      periodEnd: CalendarDate;
      reportBillingValue: number;
      reportBillingBalance: number;
      reportCostValue: number;
      reportCostBalance: number;
      /** Billing vs cost margin (see `Report.billingCostBalance`). */
      billingCostBalance: number;
    }
  | {
      kind: "billing";
      billingId: number;
      unpaid: boolean;
      /** Invoice number for display (e.g. tooltips); falls back if API omits it. */
      invoiceNumber: string;
      totalNet: number;
      totalGross: number;
      currency: string;
      /** Used in tooltip as due/invoice date (no separate due date on billing). */
      invoiceDate: CalendarDate;
      /** Iteration whose report links this billing (billing lane highlights this period). */
      iterationId: ProjectIteration["id"];
      periodStart: CalendarDate;
      periodEnd: CalendarDate;
    }
  | {
      kind: "cost";
      costId: number;
      netValue: number;
      grossValue: number | null;
      currency: string;
      invoiceDate: CalendarDate;
      invoiceNumber: string | null;
      /** Report calendar periods that link this cost (shown on cost-lane diamond hover). */
      linkedReportPeriods: readonly {
        periodStart: CalendarDate;
        periodEnd: CalendarDate;
      }[];
    };

export interface BuildProjectTimelineLanesOptions {
  /** When set (e.g. global timeline), bar labels include the project name. */
  projectNameById?: ReadonlyMap<Project["id"], string>;
  /** Default `client`. */
  groupBy?: ProjectTimelineGroupBy;
  /** For client grouping labels; falls back to `Client {id}`. */
  clientNameById?: ReadonlyMap<number, string>;
  /**
   * Pre-formatted billing totals from each iteration’s latest generated report
   * (`GeneratedReportSource`, newest `createdAt`).
   */
  latestGeneratedReportBillingLabelByIterationId?: ReadonlyMap<
    ProjectIteration["id"],
    string
  >;
}

type ClientGroupKey = { kind: "client"; clientId: Project["clientId"] };
type ProjectGroupKey = { kind: "project"; projectId: Project["id"] };
type GroupKey = ClientGroupKey | ProjectGroupKey;

function contractorDisplayName(c: { name: string; fullName: string }): string {
  const full = c.fullName.trim();
  const short = c.name.trim();
  return full || short || "";
}

function groupRootId(key: GroupKey): string {
  return key.kind === "client"
    ? `tl-c-${key.clientId}`
    : `tl-p-${key.projectId}`;
}

function groupLabel(
  key: GroupKey,
  projectNameById: ReadonlyMap<Project["id"], string>,
  clientNameById: ReadonlyMap<number, string> | undefined,
): string {
  if (key.kind === "client") {
    return (
      clientNameById?.get(key.clientId) ?? `Client ${key.clientId}`
    );
  }
  return projectNameById.get(key.projectId) ?? `Project ${key.projectId}`;
}

function compareGroups(
  a: GroupKey,
  b: GroupKey,
  projectNameById: ReadonlyMap<Project["id"], string>,
  clientNameById: ReadonlyMap<number, string> | undefined,
): number {
  const na = groupLabel(a, projectNameById, clientNameById).toLowerCase();
  const nb = groupLabel(b, projectNameById, clientNameById).toLowerCase();
  const c = na.localeCompare(nb);
  if (c !== 0) return c;
  if (a.kind === "client" && b.kind === "client") {
    return a.clientId - b.clientId;
  }
  if (a.kind === "project" && b.kind === "project") {
    return a.projectId - b.projectId;
  }
  return 0;
}

/** Single instant on invoice/calendar day (local noon) for milestone-style timeline markers. */
function calendarDateToZonedInstant(
  date: CalendarDate,
  timeZone: string,
): ZonedDateTime {
  return toZoned(date, timeZone).add({ hours: 12 });
}

/**
 * Base iteration line: `N · project name` (ordinal only; pair with a cycle-style icon in the UI).
 * Used for draw preview text and tooltip title.
 */
export function projectTimelineIterationBarLabel(
  projectNameById: ReadonlyMap<Project["id"], string>,
  projectId: Project["id"],
  ordinalNumber: number,
): string {
  const orderPart = String(ordinalNumber);
  const pn = projectNameById.get(projectId)?.trim();
  const namePart = pn ? pn : `Project ${projectId}`;
  return `${orderPart} · ${namePart}`;
}

/** Next ordinal for a new iteration on that project (max existing + 1). */
export function nextIterationOrdinalForProject(
  iterations: readonly ProjectIteration[],
  projectId: Project["id"],
): number {
  let max = 0;
  for (const it of iterations) {
    if (it.projectId === projectId) {
      max = Math.max(max, it.ordinalNumber);
    }
  }
  return max + 1;
}

/** Inclusive calendar period from a bar drawn on the timeline (zoned instants or calendar days). */
export function suggestedIterationPeriodFromDrawnBar(
  start: TimelineTemporal,
  end: TimelineTemporal,
): { periodStart: CalendarDate; periodEnd: CalendarDate } {
  const periodStart =
    start instanceof CalendarDate ? start : toCalendarDate(start);
  let periodEnd = end instanceof CalendarDate ? end : toCalendarDate(end);
  if (periodEnd.compare(periodStart) < 0) {
    periodEnd = periodStart;
  }
  return { periodStart, periodEnd };
}

/** Index every lane row (root and nested) by id for draw / interaction lookups. */
export function indexProjectTimelineLanesById(
  roots: Lane<ProjectTimelineLaneMeta>[],
): Map<string, Lane<ProjectTimelineLaneMeta>> {
  const m = new Map<string, Lane<ProjectTimelineLaneMeta>>();
  function walk(nodes: Lane<ProjectTimelineLaneMeta>[]) {
    for (const n of nodes) {
      m.set(n.id, n);
      if (n.children?.length) walk(n.children);
    }
  }
  walk(roots);
  return m;
}

function groupKeyForIteration(
  _it: ProjectIteration,
  project: Project | undefined,
  groupBy: ProjectTimelineGroupBy,
): GroupKey | null {
  if (!project) return null;
  return groupBy === "client"
    ? { kind: "client", clientId: project.clientId }
    : { kind: "project", projectId: project.id };
}

/**
 * Lanes: expandable group (client or project) with **iteration bars on the root row**;
 * children are Iteration budget (chart), Reports, Billings, Costs. Linked markers use
 * per-iteration chart colors on the timeline.
 */
export function buildProjectTimelineLanesAndItems(
  iterations: ProjectIteration[],
  reports: Report[],
  projects: readonly Project[],
  timeZone: string = getLocalTimeZone(),
  options?: BuildProjectTimelineLanesOptions,
): {
  lanes: Lane<ProjectTimelineLaneMeta>[];
  items: TimelineItem<ProjectTimelineItemData>[];
  defaultExpandedLaneIds: string[];
} {
  const groupBy = options?.groupBy ?? "client";
  const projectNameById =
    options?.projectNameById ??
    new Map(projects.map((p) => [p.id, p.name] as const));
  const clientNameById = options?.clientNameById;
  const latestGenBillingByIterationId =
    options?.latestGeneratedReportBillingLabelByIterationId;

  const projectById = new Map(projects.map((p) => [p.id, p] as const));

  const byIteration = new Map<ProjectIteration["id"], Report[]>();
  for (const r of reports) {
    const pid = r.projectIterationId;
    if (pid == null) continue;
    const list = byIteration.get(pid);
    if (list) list.push(r);
    else byIteration.set(pid, [r]);
  }

  const groupMap = new Map<
    string,
    { key: GroupKey; iterations: ProjectIteration[] }
  >();

  for (const it of iterations) {
    const project = projectById.get(it.projectId);
    const gk = groupKeyForIteration(it, project, groupBy);
    if (!gk) continue;
    const sid = gk.kind === "client" ? `c-${gk.clientId}` : `p-${gk.projectId}`;
    let g = groupMap.get(sid);
    if (!g) {
      g = { key: gk, iterations: [] };
      groupMap.set(sid, g);
    }
    g.iterations.push(it);
  }

  const sortedGroups = [...groupMap.values()].sort((a, b) =>
    compareGroups(a.key, b.key, projectNameById, clientNameById),
  );

  for (const g of sortedGroups) {
    g.iterations.sort((a, b) => a.periodStart.compare(b.periodStart));
  }

  const lanes: Lane<ProjectTimelineLaneMeta>[] = [];
  const items: TimelineItem<ProjectTimelineItemData>[] = [];
  const defaultExpandedLaneIds: string[] = [];

  let iterationColorIndex = 0;

  for (const { key, iterations: groupIterations } of sortedGroups) {
    const rootId = groupRootId(key);
    const label = groupLabel(key, projectNameById, clientNameById);

    const iterationPaletteById = new Map<
      ProjectIteration["id"],
      (typeof LANE_PALETTE)[number]
    >();
    for (const it of groupIterations) {
      iterationPaletteById.set(
        it.id,
        LANE_PALETTE[iterationColorIndex++ % LANE_PALETTE.length],
      );
    }

    const reportSeen = new Set<number>();
    const billingSeen = new Map<
      number,
      {
        billing: NonNullable<Report["linkBillingReport"][0]["billing"]>;
        contractorLabel: string;
        palette: (typeof LANE_PALETTE)[number];
        iterationId: ProjectIteration["id"];
        periodStart: CalendarDate;
        periodEnd: CalendarDate;
      }
    >();
    const costSeen = new Map<
      number,
      {
        cost: NonNullable<Report["linkCostReport"][0]["cost"]>;
        contractorLabel: string;
        palette: (typeof LANE_PALETTE)[number];
        linkedReportPeriods: {
          reportId: Report["id"];
          periodStart: CalendarDate;
          periodEnd: CalendarDate;
        }[];
      }
    >();

    for (const it of groupIterations) {
      const palette = iterationPaletteById.get(it.id)!;
      for (const r of byIteration.get(it.id) ?? []) {
        reportSeen.add(r.id);
        const reportContractor = contractorDisplayName(r.contractor);
        for (const row of r.linkBillingReport) {
          if (row.billing) {
            const prev = billingSeen.get(row.billing.id);
            if (!prev) {
              billingSeen.set(row.billing.id, {
                billing: row.billing,
                contractorLabel: reportContractor,
                palette,
                iterationId: it.id,
                periodStart: it.periodStart,
                periodEnd: it.periodEnd,
              });
            } else {
              if (!prev.contractorLabel && reportContractor) {
                prev.contractorLabel = reportContractor;
              }
            }
          }
        }
        for (const row of r.linkCostReport) {
          if (row.cost) {
            const prev = costSeen.get(row.cost.id);
            const periodEntry = {
              reportId: r.id,
              periodStart: r.periodStart,
              periodEnd: r.periodEnd,
            };
            if (!prev) {
              costSeen.set(row.cost.id, {
                cost: row.cost,
                contractorLabel: reportContractor,
                palette,
                linkedReportPeriods: [periodEntry],
              });
            } else {
              if (!prev.contractorLabel && reportContractor) {
                prev.contractorLabel = reportContractor;
              }
              if (
                !prev.linkedReportPeriods.some((p) => p.reportId === r.id)
              ) {
                prev.linkedReportPeriods.push(periodEntry);
              }
            }
          }
        }
      }
    }

    const iterationBudgetLane = `${rootId}/iteration-budget`;
    const reportsLane = `${rootId}/reports`;
    const billingsLane = `${rootId}/billings`;
    const costsLane = `${rootId}/costs`;

    const clientIdForLane =
      key.kind === "client"
        ? key.clientId
        : projectById.get(key.projectId)?.clientId;
    const projectIdForLane = key.kind === "project" ? key.projectId : undefined;
    const laneMeta: ProjectTimelineLaneMeta = {
      ...(clientIdForLane !== undefined ? { clientId: clientIdForLane } : {}),
      ...(projectIdForLane !== undefined ? { projectId: projectIdForLane } : {}),
    };

    lanes.push({
      id: rootId,
      name: label,
      color: "bg-muted-foreground/25",
      meta: laneMeta,
      children: [
        {
          id: iterationBudgetLane,
          name: "Iteration budget",
          color: "bg-emerald-600/25",
          meta: laneMeta,
          minTrackHeightPx: PROJECT_TIMELINE_ITERATION_BUDGET_LANE_MIN_HEIGHT_PX,
        },
        {
          id: reportsLane,
          name: `Reports (${reportSeen.size})`,
          color: "bg-sky-600/40",
          meta: laneMeta,
        },
        {
          id: billingsLane,
          name: `Billings (${billingSeen.size})`,
          color: "bg-violet-600/40",
          meta: laneMeta,
        },
        {
          id: costsLane,
          name: `Costs (${costSeen.size})`,
          color: "bg-orange-600/40",
          meta: laneMeta,
        },
      ],
    });

    defaultExpandedLaneIds.push(rootId);

    for (const it of groupIterations) {
      const palette = iterationPaletteById.get(it.id)!;
      const orderPart = String(it.ordinalNumber);
      const pn = projectNameById.get(it.projectId)?.trim();
      const namePart = pn ? pn : `Project ${it.projectId}`;
      const summaryLabel = `${orderPart} · ${namePart}`;
      const latestGenBilling =
        latestGenBillingByIterationId?.get(it.id) ?? undefined;
      /** Bar: iteration order · billing (if any) · project name */
      const iterationBarLabel =
        latestGenBilling != null && latestGenBilling.length > 0
          ? `${orderPart} · ${latestGenBilling} · ${namePart}`
          : summaryLabel;

      items.push({
        id: `ev-it-${it.id}`,
        laneId: rootId,
        start: it.periodStart,
        end: it.periodEnd,
        label: iterationBarLabel,
        color: palette,
        data: {
          kind: "iteration",
          iterationId: it.id,
          projectId: it.projectId,
          periodStart: it.periodStart,
          periodEnd: it.periodEnd,
          summaryLabel,
          ...(latestGenBilling != null && latestGenBilling.length > 0
            ? { latestGeneratedReportBillingLabel: latestGenBilling }
            : {}),
        },
      });

      items.push({
        id: `ev-it-budget-${it.id}`,
        laneId: iterationBudgetLane,
        start: it.periodStart,
        end: it.periodEnd,
        label: "\u00a0",
        color: palette,
        data: {
          kind: "iteration-budget",
          iterationId: it.id,
          projectId: it.projectId,
          periodStart: it.periodStart,
          periodEnd: it.periodEnd,
          currency: it.currency,
        },
      });
    }

    const reportsAdded = new Set<number>();
    const groupReports: {
      r: Report;
      palette: (typeof LANE_PALETTE)[number];
    }[] = [];
    for (const it of groupIterations) {
      const palette = iterationPaletteById.get(it.id)!;
      for (const r of byIteration.get(it.id) ?? []) {
        if (reportsAdded.has(r.id)) continue;
        reportsAdded.add(r.id);
        groupReports.push({ r, palette });
      }
    }
    groupReports.sort((a, b) => {
      const na = contractorDisplayName(a.r.contractor).toLowerCase();
      const nb = contractorDisplayName(b.r.contractor).toLowerCase();
      let c = na.localeCompare(nb);
      if (c !== 0) return c;
      c = a.r.contractor.id - b.r.contractor.id;
      if (c !== 0) return c;
      return a.r.id - b.r.id;
    });
    for (const { r, palette } of groupReports) {
      items.push({
        id: `ev-r-${r.id}`,
        laneId: reportsLane,
        start: r.periodStart,
        end: r.periodEnd,
        label:
          contractorDisplayName(r.contractor) ||
          r.description.trim().slice(0, 32) ||
          `Report ${r.id}`,
        color: palette,
        data: {
          kind: "report",
          reportId: r.id,
          netValue: r.netValue,
          currency: r.currency,
          quantity: r.quantity ?? null,
          unit: r.unit ?? null,
          unitPrice: r.unitPrice ?? null,
          periodStart: r.periodStart,
          periodEnd: r.periodEnd,
          reportBillingValue: r.reportBillingValue,
          reportBillingBalance: r.reportBillingBalance,
          reportCostValue: r.reportCostValue,
          reportCostBalance: r.reportCostBalance,
          billingCostBalance: r.billingCostBalance,
        },
      });
    }

    const billingRows = [...billingSeen.values()].sort((a, b) => {
      const wa = a.billing.workspaceId;
      const wb = b.billing.workspaceId;
      if (wa !== wb) return wa - wb;
      const byDate = a.billing.invoiceDate.compare(b.billing.invoiceDate);
      if (byDate !== 0) return byDate;
      return a.billing.id - b.billing.id;
    });
    for (const {
      billing: b,
      contractorLabel,
      palette,
      iterationId,
      periodStart,
      periodEnd,
    } of billingRows) {
      const at = calendarDateToZonedInstant(b.invoiceDate, timeZone);
      const unpaid = b.paidAt == null;
      const invoiceNumber =
        b.invoiceNumber.trim() || `Billing ${b.id}`;
      const baseLabel = contractorLabel || invoiceNumber;
      items.push({
        id: `ev-b-${b.id}-${rootId}`,
        laneId: billingsLane,
        start: at,
        end: at,
        label: unpaid ? `${baseLabel} · unpaid` : baseLabel,
        color: palette,
        data: {
          kind: "billing",
          billingId: b.id,
          unpaid,
          invoiceNumber,
          totalNet: b.totalNet,
          totalGross: b.totalGross,
          currency: b.currency,
          invoiceDate: b.invoiceDate,
          iterationId,
          periodStart,
          periodEnd,
        },
      });
    }

    for (const {
      cost: c,
      contractorLabel,
      palette,
      linkedReportPeriods,
    } of costSeen.values()) {
      const at = calendarDateToZonedInstant(c.invoiceDate, timeZone);
      const periodsSorted = [...linkedReportPeriods].sort((a, b) =>
        a.periodStart.compare(b.periodStart),
      );
      items.push({
        id: `ev-c-${c.id}-${rootId}`,
        laneId: costsLane,
        start: at,
        end: at,
        label:
          contractorLabel ||
          (c.invoiceNumber?.trim() ?? "") ||
          `Cost ${c.id}`,
        color: palette,
        data: {
          kind: "cost",
          costId: c.id,
          netValue: c.netValue,
          grossValue: c.grossValue ?? null,
          currency: c.currency,
          invoiceDate: c.invoiceDate,
          invoiceNumber:
            typeof c.invoiceNumber === "string" && c.invoiceNumber.trim()
              ? c.invoiceNumber.trim()
              : null,
          linkedReportPeriods: periodsSorted.map(
            ({ periodStart, periodEnd }) => ({
              periodStart,
              periodEnd,
            }),
          ),
        },
      });
    }
  }

  return { lanes, items, defaultExpandedLaneIds };
}
