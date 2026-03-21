import { clientQueryUtils } from "@/api/clients/clients.api";
import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api";
import { contractorQueryUtils } from "@/api/contractor/contractor.api";
import { projectIterationQueryUtils } from "@/api/project-iteration/project-iteration.api";
import { projectQueryUtils } from "@/api/project/project.api";
import {
  dashboardQueryUtils,
  type TmetricDashboardCacheScope,
} from "@/api/tmetric-dashboard-cache/tmetric-dashboard-cache.api";
import type { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api";
import { WithFrontServices } from "@/core/frontServices";
import type { SimpleItem } from "@/features/_common/elements/pickers/SimpleView";
import { idSpecUtils } from "@/platform/lang/IdSpec";
import { calendarDateToJSDate } from "@/platform/lang/internationalized-date";
import type {
  ClientSpec,
  WorkspaceSpec,
} from "@/routing/routingUtils.ts";
import type { ContractorsWithIntegrationStatus } from "@/services/front/TmetricDashboardService/TmetricDashboardService";
import { maybe, mt, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildTimelineFromReport,
  getContractorIterationBreakdown,
  getContractorsSummaryScopedToIterations,
  getDateRangeForPreset,
  getDateRangeFromIterations,
  getIterationSummary,
  intersectDateRanges,
  iterationsOverlappingRange,
  type ContractorIterationBreakdown,
  type ContractorsSummaryScoped,
  type TimePreset,
} from "./tmetric-dashboard.utils";
import type { IterationSummary } from "./tmetric-dashboard.utils";

export interface UseTmetricDashboardDataParams {
  services: WithFrontServices["services"];
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
}

export interface UseTmetricDashboardDataResult {
  // Query / scope
  dashboardQuery: { timePreset: TimePreset; iterationIds: number[] };
  setTimePreset: (value: TimePreset) => void;
  setSelectedIterationIds: (ids: number[]) => void;
  timePreset: TimePreset;
  selectedIterationIds: number[];
  scope: TmetricDashboardCacheScope;
  start: Date | null;
  end: Date | null;
  canLoadOrRefresh: boolean;
  setCustomRange: (start: Date, end: Date) => void;
  navigatePrev: (unit: "day" | "week" | "month") => void;
  navigateNext: (unit: "day" | "week" | "month") => void;

  // Report cache (shared TanStack cache – same key on dashboard and contractor detail)
  cachedReportQuery: ReturnType<
    WithFrontServices["services"]["tmetricDashboardService"]["useCached"]
  >;
  handleRefresh: () => void;
  isRefreshing: boolean;
  refreshMutation: ReturnType<typeof promiseState.useMutation>;

  // Projects / iterations
  projectsData: ReturnType<
    WithFrontServices["services"]["projectService"]["useProjects"]
  >;
  iterationsForScope: ProjectIteration[];
  projectsMap: Map<number, { name: string }>;
  iterationRange: ReturnType<typeof getDateRangeFromIterations>;
  iterationPickerItems: SimpleItem[];

  // Derived from report
  contractorIterationBreakdown: import("@passionware/monads").RemoteData<
    ContractorIterationBreakdown[] | null
  >;
  contractorNameMap: import("@passionware/monads").RemoteData<
    Map<number, string>
  >;
  timeline: import("@passionware/monads").RemoteData<{
    timelineLanes: import("@/platform/passionware-timeline").Lane[];
    timelineItems: import("@/platform/passionware-timeline").TimelineItem<unknown>[];
  }>;
  contractorsSummary: import("@passionware/monads").RemoteData<ContractorsSummaryScoped>;
  iterationSummary: import("@passionware/monads").RemoteData<
    IterationSummary[] | null
  >;

  // Report as source (for cube, etc.)
  basicInfo: import("@passionware/monads").RemoteData<unknown>;
  reportAsSource: import("@passionware/monads").RemoteData<GeneratedReportSource>;

  // Integration
  integrationStatus: ContractorsWithIntegrationStatus | null;
}

export function useTmetricDashboardData({
  services,
  workspaceId,
  clientId,
}: UseTmetricDashboardDataParams): UseTmetricDashboardDataResult {
  const queryParamsService = services.queryParamsService.forEntity("dashboard");
  const rawQueryParams = queryParamsService.useQueryParams();
  const dashboardQuery = useMemo(
    () => dashboardQueryUtils.ensureDefault(rawQueryParams),
    [rawQueryParams],
  );
  const timePreset = dashboardQuery.timePreset;
  const selectedIterationIds = dashboardQuery.iterationIds;
  const setTimePreset = useCallback(
    (value: TimePreset) => {
      queryParamsService.setQueryParams({
        ...dashboardQuery,
        timePreset: value,
      });
    },
    [queryParamsService, dashboardQuery],
  );
  const setSelectedIterationIds = useCallback(
    (ids: number[]) => {
      queryParamsService.setQueryParams({
        ...dashboardQuery,
        iterationIds: ids,
      });
    },
    [queryParamsService, dashboardQuery],
  );

  const [integrationStatus, setIntegrationStatus] =
    useState<ContractorsWithIntegrationStatus | null>(null);

  const projectsQuery = projectQueryUtils.withEnsureDefault({
    workspaceId,
    clientId,
  })(projectQueryUtils.ofDefault());
  const projectsWithActiveFilter = useMemo(
    () =>
      projectQueryUtils
        .transform(projectsQuery)
        .build((q) => [
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
  const iterationsData = services.projectIterationService.useProjectIterations(
    maybe.of(iterationsQuery),
  );
  const allIterations = useMemo(
    () => rd.tryMap(iterationsData, (x) => x) ?? [],
    [iterationsData],
  );
  const iterationsForPicker = useMemo(
    () =>
      [...allIterations].sort((a, b) => {
        const endA = calendarDateToJSDate(a.periodEnd).getTime();
        const endB = calendarDateToJSDate(b.periodEnd).getTime();
        return endB - endA;
      }),
    [allIterations],
  );

  const projectsMap = useMemo(() => {
    const map = new Map<number, { name: string; clientId: number }>();
    rd.tryMap(projectsData, (projects) => {
      projects.forEach((p) => map.set(p.id, { name: p.name, clientId: p.clientId }));
    });
    return map;
  }, [projectsData]);

  const uniqueClientIds = useMemo(
    () =>
      rd.tryMap(projectsData, (projects) => [
        ...new Set(projects.map((p) => p.clientId)),
      ]) ?? [],
    [projectsData],
  );

  const clientsQuery = useMemo(
    () =>
      clientQueryUtils.getBuilder().build((q) => [
        q.withFilter("id", {
          operator: "oneOf",
          value: uniqueClientIds.length > 0 ? uniqueClientIds : [],
        }),
      ]),
    [uniqueClientIds],
  );
  const clientsData = services.clientService.useClients(clientsQuery);
  const clientsMap = useMemo(() => {
    const map = new Map<number, { avatarUrl: string | null }>();
    rd.tryMap(clientsData, (clients) => {
      clients.forEach((c) =>
        map.set(c.id, { avatarUrl: c.avatarUrl ?? null }),
      );
    });
    return map;
  }, [clientsData]);

  const selectedIterations = useMemo(
    () => allIterations.filter((i) => selectedIterationIds.includes(i.id)),
    [allIterations, selectedIterationIds],
  );

  const iterationsForScope = useMemo(() => {
    if (selectedIterationIds.length > 0) return selectedIterations;
    return allIterations.filter((i) => i.status === "active");
  }, [selectedIterationIds, selectedIterations, allIterations]);

  const scopeIterationIdsKey = useMemo(
    () =>
      (selectedIterationIds.length > 0
        ? [...selectedIterationIds].sort((a, b) => a - b)
        : allIterations
            .filter((i) => i.status === "active")
            .map((i) => i.id)
            .sort((a, b) => a - b)
      ).join(","),
    [selectedIterationIds, allIterations],
  );

  const iterationRange = useMemo(
    () => getDateRangeFromIterations(iterationsForScope),
    [iterationsForScope],
  );

  const customRange = useMemo((): { start: Date; end: Date } | null => {
    if (timePreset !== "custom") return null;
    const { customStart, customEnd } = dashboardQuery;
    if (!customStart || !customEnd) return null;
    const start = new Date(customStart);
    const end = new Date(customEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end)
      return null;
    return { start, end };
  }, [timePreset, dashboardQuery]);

  const iterationPickerItems: SimpleItem[] = useMemo(
    () =>
      iterationsForPicker.map((iter) => {
        const project = projectsMap.get(iter.projectId);
        const projectName = project?.name ?? `Project ${iter.projectId}`;
        const periodLabel = `${format(calendarDateToJSDate(iter.periodStart), "dd MMM yyyy")} – ${format(calendarDateToJSDate(iter.periodEnd), "dd MMM yyyy")}`;
        const statusLabel =
          iter.status === "active"
            ? " · Active"
            : iter.status === "closed"
              ? " · Closed"
              : "";
        const clientAvatarUrl =
          project != null ? clientsMap.get(project.clientId)?.avatarUrl ?? null : null;
        return {
          id: String(iter.id),
          label: `${projectName} #${iter.ordinalNumber}${statusLabel} (${periodLabel})`,
          compactLabel: `${projectName} #${iter.ordinalNumber}`,
          avatarUrl: clientAvatarUrl ?? undefined,
        };
      }),
    [iterationsForPicker, projectsMap, clientsMap],
  );

  const { start, end } = useMemo(() => {
    const requestedRange = getDateRangeForPreset(
      timePreset,
      iterationRange,
      customRange,
    );
    if (!requestedRange)
      return { start: null as Date | null, end: null as Date | null };
    const effectiveRange =
      iterationRange != null
        ? intersectDateRanges(requestedRange, iterationRange)
        : requestedRange;
    if (!effectiveRange)
      return { start: null as Date | null, end: null as Date | null };
    return { start: effectiveRange.start, end: effectiveRange.end };
  }, [timePreset, iterationRange, customRange]);

  const setCustomRange = useCallback(
    (rangeStart: Date, rangeEnd: Date) => {
      queryParamsService.setQueryParams({
        ...dashboardQuery,
        timePreset: "custom",
        customStart: format(rangeStart, "yyyy-MM-dd"),
        customEnd: format(rangeEnd, "yyyy-MM-dd"),
      });
    },
    [queryParamsService, dashboardQuery],
  );

  const navigatePrev = useCallback(
    (unit: "day" | "week" | "month") => {
      if (start === null || end === null) return;
      const shift =
        unit === "day"
          ? (d: Date) => subDays(d, 1)
          : unit === "week"
            ? (d: Date) => subWeeks(d, 1)
            : (d: Date) => subMonths(d, 1);
      setCustomRange(shift(start), shift(end));
    },
    [start, end, setCustomRange],
  );

  const navigateNext = useCallback(
    (unit: "day" | "week" | "month") => {
      if (start === null || end === null) return;
      const shift =
        unit === "day"
          ? (d: Date) => addDays(d, 1)
          : unit === "week"
            ? (d: Date) => addWeeks(d, 1)
            : (d: Date) => addMonths(d, 1);
      setCustomRange(shift(start), shift(end));
    },
    [start, end, setCustomRange],
  );

  const scope: TmetricDashboardCacheScope = useMemo(() => {
    const s: TmetricDashboardCacheScope = { projectIterationIds: [] };
    if (maybe.isPresent(workspaceId) && !idSpecUtils.isAll(workspaceId)) {
      s.workspaceIds = [workspaceId];
    }
    if (maybe.isPresent(clientId) && !idSpecUtils.isAll(clientId)) {
      s.clientIds = [clientId];
    }
    s.projectIterationIds = scopeIterationIdsKey
      ? scopeIterationIdsKey.split(",").map(Number)
      : [];
    return s;
  }, [workspaceId, clientId, scopeIterationIdsKey]);

  const loadIntegrationStatus = useCallback(async () => {
    const status =
      await services.tmetricDashboardService.getContractorsInScopeWithIntegrationStatus(
        scope,
      );
    setIntegrationStatus(status);
  }, [services.tmetricDashboardService, scope]);

  const canLoadOrRefresh = start !== null && end !== null;

  const cachedReportQuery = services.tmetricDashboardService.useCached({
    scope,
    periodStart: start,
    periodEnd: end,
  });

  const refreshMutation = promiseState.useMutation(async () => {
    if (!canLoadOrRefresh) return null;
    return services.tmetricDashboardService.refreshAndCache({
      scope,
      periodStart: start,
      periodEnd: end,
    });
  });

  const handleRefresh = useCallback(() => {
    if (!canLoadOrRefresh) return;
    refreshMutation.track(undefined).catch(() => {});
  }, [refreshMutation, canLoadOrRefresh]);

  useEffect(() => {
    loadIntegrationStatus();
  }, [loadIntegrationStatus]);

  const contractorIdsInReport = rd.useMemoMap(
    cachedReportQuery,
    (cachedReport) => [
      ...new Set(cachedReport.data.timeEntries.map((e) => e.contractorId)),
    ],
  );

  const contractorsQuery = services.contractorService.useContractors(
    rd.tryMap(contractorIdsInReport, (ids) =>
      contractorQueryUtils.getBuilder().build((q) =>
        ids.length
          ? [
              q.withFilter("id", {
                operator: "oneOf",
                value: ids,
              }),
            ]
          : [],
      ),
    ),
  );

  const contractorNameMap = rd.useMemoMap(
    contractorsQuery,
    (contractors) => new Map(contractors.map((c) => [c.id, c.fullName])),
  );

  const iterationsForBreakdown = rd.useMemoMap(
    cachedReportQuery,
    (cachedReport) => {
      if (!cachedReport || !start || !end) return [];
      return iterationsOverlappingRange(iterationsForScope, start, end);
    },
  );

  const contractorIterationBreakdown = rd.useMemoMap(
    rd.combine({ cachedReportQuery, iterationsForBreakdown }),
    ({ cachedReportQuery, iterationsForBreakdown }) => {
      if (!cachedReportQuery || !start || !end) return null;
      return getContractorIterationBreakdown(
        { data: cachedReportQuery.data },
        iterationsForBreakdown,
        projectsMap,
        start,
        end,
      );
    },
  );

  const contractorsSummary = useMemo(
    () =>
      rd.map(cachedReportQuery, (cachedReport) =>
        getContractorsSummaryScopedToIterations(
          cachedReport.data,
          iterationsForScope.map((i) => i.id),
        ),
      ),
    [cachedReportQuery, iterationsForScope],
  );

  const iterationSummary = rd.useMemoMap(
    rd.combine({ cachedReportQuery, iterationsForBreakdown }),
    ({ cachedReportQuery, iterationsForBreakdown }) => {
      if (!cachedReportQuery || !start || !end) return null;
      return getIterationSummary(
        { data: cachedReportQuery.data },
        iterationsForBreakdown,
        projectsMap,
        start,
        end,
      );
    },
  );

  const timeline = rd.useMemoMap(
    rd.combine({ cachedReportQuery, contractorNameMap }),
    ({ cachedReportQuery, contractorNameMap }) => {
      if (!cachedReportQuery) return { timelineLanes: [], timelineItems: [] };
      const { lanes, items } = buildTimelineFromReport(
        { data: cachedReportQuery.data },
        contractorNameMap,
      );
      return { timelineLanes: lanes, timelineItems: items };
    },
  );

  const basicInfo = rd.useMemoMap(cachedReportQuery, (cachedReport) =>
    services.generatedReportViewService.getBasicInformationView({
      id: 0,
      createdAt: new Date(),
      projectIterationId: 0,
      data: cachedReport.data,
      originalData: null,
    }),
  );

  const reportAsSource = rd.useMemoMap(cachedReportQuery, (cachedReport) => ({
    id: 0,
    createdAt: new Date(),
    projectIterationId: 0,
    data: cachedReport.data,
    originalData: null,
  }));

  return {
    dashboardQuery: { timePreset, iterationIds: selectedIterationIds },
    setTimePreset,
    setSelectedIterationIds,
    timePreset,
    selectedIterationIds,
    scope,
    start,
    end,
    canLoadOrRefresh,
    setCustomRange,
    navigatePrev,
    navigateNext,
    cachedReportQuery,
    handleRefresh,
    isRefreshing: mt.isInProgress(refreshMutation.state),
    refreshMutation,
    projectsData,
    iterationsForScope,
    projectsMap,
    iterationRange,
    iterationPickerItems,
    contractorIterationBreakdown,
    contractorNameMap,
    timeline,
    contractorsSummary,
    iterationSummary,
    basicInfo,
    reportAsSource,
    integrationStatus,
  };
}
