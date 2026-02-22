import {
  TmetricDashboardCacheApi,
  TmetricDashboardCacheEntry,
  TmetricDashboardCacheScope,
} from "@/api/tmetric-dashboard-cache/tmetric-dashboard-cache.api";
import {
  ProjectIteration,
  ProjectIterationApi,
} from "@/api/project-iteration/project-iteration.api";
import { maybe } from "@passionware/monads";
import { QueryClient, useQuery } from "@tanstack/react-query";
import { ensureIdleQuery } from "@/services/io/_common/ensureIdleQuery";
import { projectQueryUtils } from "@/api/project/project.api";
import { projectIterationQueryUtils } from "@/api/project-iteration/project-iteration.api";
import { WithServices } from "@/platform/typescript/services";
import { createTmetricPlugin } from "@/services/io/ReportGenerationService/plugins/tmetric/TmetricPlugin";
import {
  extractPrefilledRatesFromGenericReport,
  PrefilledRateResult,
} from "@/services/io/ReportGenerationService/plugins/_common/extractPrefilledRates";
import { GenericReport } from "@/services/io/_common/GenericReport";
import { getContractorIdFromRoleKey } from "@/services/io/_common/roleKeyUtils";
import {
  ExpressionContext,
  ExpressionService,
  WithExpressionService,
} from "@/services/front/ExpressionService/ExpressionService";
import { WithProjectIterationService } from "@/services/io/ProjectIterationService/ProjectIterationService";
import { WithProjectService } from "@/services/io/ProjectService/ProjectService";
import {
  ContractorInScope,
  ContractorsInScopeResult,
  ContractorsWithIntegrationStatus,
  TmetricDashboardService,
} from "./TmetricDashboardService";
import {
  calendarDateToJSDate,
  dateToCalendarDate,
} from "@/platform/lang/internationalized-date";
import { endOfDay, startOfDay } from "date-fns";
import type { CalendarDate } from "@internationalized/date";

const TMETRIC_DASHBOARD_CACHE_QUERY_KEY = ["tmetric_dashboard_cache"] as const;

const NO_CACHED_REPORT_MESSAGE = "No cached report found for scope";

/** Intersection of requested period with iteration period. Returns null if no overlap. */
function intersectRequestedWithIteration(
  requestedStart: Date,
  requestedEnd: Date,
  iterPeriodStart: CalendarDate,
  iterPeriodEnd: CalendarDate,
): { start: CalendarDate; end: CalendarDate } | null {
  const iterStart = startOfDay(calendarDateToJSDate(iterPeriodStart));
  const iterEnd = endOfDay(calendarDateToJSDate(iterPeriodEnd));
  const startMs = Math.max(requestedStart.getTime(), iterStart.getTime());
  const endMs = Math.min(requestedEnd.getTime(), iterEnd.getTime());
  if (startMs > endMs) return null;
  return {
    start: dateToCalendarDate(new Date(startMs)),
    end: dateToCalendarDate(new Date(endMs)),
  };
}

function scopeToKey(scope: TmetricDashboardCacheScope): string {
  const w = (scope.workspaceIds ?? [])
    .slice()
    .sort((a, b) => a - b)
    .join(",");
  const c = (scope.clientIds ?? [])
    .slice()
    .sort((a, b) => a - b)
    .join(",");
  const p =
    scope.projectIterationIds === "all_active"
      ? "all_active"
      : (scope.projectIterationIds ?? [])
          .slice()
          .sort((a, b) => a - b)
          .join(",");
  return `w:${w}|c:${c}|p:${p}`;
}

function getCacheQueryKey(
  scope: TmetricDashboardCacheScope,
  periodStart: Date | null,
  periodEnd: Date | null,
): readonly [string, string, string, string] {
  return [
    ...TMETRIC_DASHBOARD_CACHE_QUERY_KEY,
    scopeToKey(scope),
    periodStart?.toISOString().slice(0, 10) ?? "",
    periodEnd?.toISOString().slice(0, 10) ?? "",
  ];
}

export type TmetricDashboardServiceConfig = WithServices<
  [WithProjectService, WithProjectIterationService, WithExpressionService]
> & {
  cacheApi: TmetricDashboardCacheApi;
  projectIterationApi: ProjectIterationApi;
  client: QueryClient;
};

function applyPrefilledRatesToReport(
  report: GenericReport,
  prefilledRates: PrefilledRateResult,
): GenericReport {
  const updated: GenericReport = {
    ...report,
    definitions: {
      ...report.definitions,
      roleTypes: { ...report.definitions.roleTypes },
    },
  };
  for (const contractorRate of prefilledRates) {
    // Apply rates to every role type key that belongs to this contractor (scoped keys)
    for (const [roleId, roleType] of Object.entries(
      updated.definitions.roleTypes,
    )) {
      if (getContractorIdFromRoleKey(roleId) === contractorRate.contractorId) {
        updated.definitions.roleTypes[roleId] = {
          ...roleType,
          rates: contractorRate.rates,
        };
      }
    }
  }
  return updated;
}

/** Resolves iterations in scope with their date ranges (periodStart, periodEnd). */
async function resolveIterationsInScope(
  config: TmetricDashboardServiceConfig,
  scope: TmetricDashboardCacheScope,
): Promise<ProjectIteration[]> {
  const workspaceIds = scope.workspaceIds ?? [];
  const clientIds = scope.clientIds ?? [];
  const projectIterationIds = scope.projectIterationIds;

  const projectQuery = projectQueryUtils.getBuilder().build((q) => {
    const filters: ReturnType<typeof q.withFilter>[] = [];
    if (workspaceIds.length) {
      filters.push(
        q.withFilter("workspaceId", { operator: "oneOf", value: workspaceIds }),
      );
    }
    if (clientIds.length) {
      filters.push(
        q.withFilter("clientId", { operator: "oneOf", value: clientIds }),
      );
    }
    filters.push(
      q.withFilter("status", {
        operator: "oneOf",
        value: ["active", "closed"],
      }),
    );
    return filters;
  });

  const projects =
    await config.services.projectService.ensureProjects(projectQuery);
  const projectIds = projects.map((p) => p.id);

  if (projectIterationIds === "all_active") {
    const iterQuery = projectIterationQueryUtils.getBuilder().build((q) =>
      projectIds.length
        ? [
            q.withFilter("status", {
              operator: "oneOf",
              value: ["active"],
            }),
            q.withFilter("projectId", {
              operator: "oneOf",
              value: projectIds,
            }),
          ]
        : [
            q.withFilter("status", {
              operator: "oneOf",
              value: ["active"],
            }),
          ],
    );
    return config.services.projectIterationService.ensureProjectIterations(
      iterQuery,
    );
  }

  if (Array.isArray(projectIterationIds) && projectIterationIds.length > 0) {
    const byIds =
      await config.projectIterationApi.getProjectIterationsByIds(
        projectIterationIds,
      );
    return Object.values(byIds);
  }

  return [];
}

async function resolveContractorsInScope(
  config: TmetricDashboardServiceConfig,
  scope: TmetricDashboardCacheScope,
): Promise<ContractorsInScopeResult> {
  const workspaceIds = scope.workspaceIds ?? [];
  const clientIds = scope.clientIds ?? [];
  const contractorIdsFilter = scope.contractorIds ?? [];
  const projectIterationIds = scope.projectIterationIds;

  const projectQuery = projectQueryUtils.getBuilder().build((q) => {
    const filters: ReturnType<typeof q.withFilter>[] = [];
    if (workspaceIds.length) {
      filters.push(
        q.withFilter("workspaceId", { operator: "oneOf", value: workspaceIds }),
      );
    }
    if (clientIds.length) {
      filters.push(
        q.withFilter("clientId", { operator: "oneOf", value: clientIds }),
      );
    }
    filters.push(
      q.withFilter("status", {
        operator: "oneOf",
        value: ["active", "closed"],
      }),
    );
    return filters;
  });

  const projects =
    await config.services.projectService.ensureProjects(projectQuery);
  let projectIds = projects.map((p) => p.id);
  let iterations: ProjectIteration[] = [];

  if (projectIterationIds !== undefined) {
    if (projectIterationIds === "all_active") {
      const iterQuery = projectIterationQueryUtils.getBuilder().build((q) =>
        projectIds.length
          ? [
              q.withFilter("status", {
                operator: "oneOf",
                value: ["active"],
              }),
              q.withFilter("projectId", {
                operator: "oneOf",
                value: projectIds,
              }),
            ]
          : [
              q.withFilter("status", {
                operator: "oneOf",
                value: ["active"],
              }),
            ],
      );
      iterations =
        await config.services.projectIterationService.ensureProjectIterations(
          iterQuery,
        );
      projectIds = [...new Set(iterations.map((i) => i.projectId))];
      if (projectIds.length === 0) projectIds = projects.map((p) => p.id);
    } else if (
      Array.isArray(projectIterationIds) &&
      projectIterationIds.length > 0
    ) {
      const byIds =
        await config.projectIterationApi.getProjectIterationsByIds(
          projectIterationIds,
        );
      iterations = Object.values(byIds);
      projectIds = [...new Set(iterations.map((i) => i.projectId))];
    } else {
      projectIds = [];
    }
  }

  const byProject = new Map<number, ContractorInScope[]>();
  const seen = new Set<string>();
  const all: ContractorInScope[] = [];

  for (const project of projects) {
    if (!projectIds.includes(project.id)) continue;

    const contractors =
      await config.services.projectService.ensureProjectContractors(project.id);
    const projectList: ContractorInScope[] = [];

    for (const pc of contractors) {
      const cid = pc.contractor.id;
      if (contractorIdsFilter.length && !contractorIdsFilter.includes(cid))
        continue;

      const entry: ContractorInScope = {
        contractorId: cid,
        workspaceId: pc.workspaceId,
        clientId: project.clientId,
      };
      projectList.push(entry);

      const key = `${cid}:${pc.workspaceId}:${project.clientId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(entry);
    }

    byProject.set(project.id, projectList);
  }

  const byIteration = new Map<number, ContractorInScope[]>();
  for (const iter of iterations) {
    byIteration.set(iter.id, byProject.get(iter.projectId) ?? []);
  }

  return { byIteration, all };
}

const TMETRIC_REQUIRED_VARS = [
  "vars.tmetric_user",
  "vars.new_hour_cost_rate",
  "vars.new_hour_billing_rate",
] as const;

async function filterContractorsByTmetricIntegration(
  contractors: ContractorInScope[],
  expressionService: Pick<ExpressionService, "ensureExpressionValue">,
): Promise<ContractorsWithIntegrationStatus> {
  const integrated: ContractorInScope[] = [];
  const nonIntegrated: ContractorInScope[] = [];

  for (const c of contractors) {
    const context: ExpressionContext = {
      workspaceId: c.workspaceId,
      clientId: c.clientId,
      contractorId: c.contractorId,
    };
    let hasAllVars = true;
    for (const expr of TMETRIC_REQUIRED_VARS) {
      try {
        await expressionService.ensureExpressionValue(context, expr, {});
      } catch {
        hasAllVars = false;
        break;
      }
    }
    if (hasAllVars) {
      integrated.push(c);
    } else {
      nonIntegrated.push(c);
    }
  }

  const integratedIds = [...new Set(integrated.map((c) => c.contractorId))];
  const integratedIdSet = new Set(integratedIds);
  const nonIntegratedIds = [
    ...new Set(
      nonIntegrated
        .filter((c) => !integratedIdSet.has(c.contractorId))
        .map((c) => c.contractorId),
    ),
  ];

  return {
    integrated,
    nonIntegrated,
    integratedContractorIds: integratedIds,
    nonIntegratedContractorIds: nonIntegratedIds,
  };
}

/** Fetches from TMetric and creates cache entry. Used by refreshAndCache and by useCached fallback. */
async function performRefreshAndCache(
  config: TmetricDashboardServiceConfig,
  params: {
    scope: TmetricDashboardCacheScope;
    periodStart: Date;
    periodEnd: Date;
  },
): Promise<TmetricDashboardCacheEntry> {
  const { scope, periodStart, periodEnd } = params;
  const { cacheApi, services } = config;

  const { byIteration } = await resolveContractorsInScope(config, scope);
  const iterations = await resolveIterationsInScope(config, scope);

  if (iterations.length === 0) {
    throw new Error(
      "No iterations in scope. Select at least one iteration.",
    );
  }

  const perIterationIntegrated: {
    iteration: ProjectIteration;
    integrated: ContractorInScope[];
    nonIntegrated: ContractorInScope[];
  }[] = [];

  for (const iter of iterations) {
    const contractors = byIteration.get(iter.id) ?? [];
    const { integrated, nonIntegrated } =
      await filterContractorsByTmetricIntegration(
        contractors,
        services.expressionService,
      );
    perIterationIntegrated.push({
      iteration: iter,
      integrated,
      nonIntegrated,
    });
  }

  const requestedStart = periodStart;
  const requestedEnd = periodEnd;

  const reports = perIterationIntegrated.flatMap(
    ({ iteration, integrated }) => {
      const period = intersectRequestedWithIteration(
        requestedStart,
        requestedEnd,
        iteration.periodStart,
        iteration.periodEnd,
      );
      if (!period) return [];
      return integrated.map((c) => ({
        contractorId: c.contractorId,
        periodStart: period.start,
        periodEnd: period.end,
        workspaceId: c.workspaceId,
        clientId: c.clientId,
        iterationId: iteration.id,
        projectId: iteration.projectId,
      }));
    },
  );

  if (reports.length === 0) {
    throw new Error(
      "Requested period does not overlap any iteration in scope. Adjust the date range or iterations.",
    );
  }

  const allIntegrated = [
    ...new Map(
      perIterationIntegrated.flatMap(({ integrated }) =>
        integrated.map((c) => [
          `${c.contractorId}:${c.workspaceId}:${c.clientId}`,
          c,
        ]),
      ),
    ).values(),
  ];
  const totalNonIntegrated = perIterationIntegrated.reduce(
    (sum, { nonIntegrated }) => sum + nonIntegrated.length,
    0,
  );

  if (allIntegrated.length === 0) {
    if (totalNonIntegrated > 0) {
      throw new Error(
        `No contractors with TMetric integration in scope. ${totalNonIntegrated} contractor(s) are not integrated (missing tmetric_user, new_hour_cost_rate, or new_hour_billing_rate).`,
      );
    }
    throw new Error("No contractors in scope. Adjust filters.");
  }

  const tmetricPlugin = createTmetricPlugin({
    services: { expressionService: services.expressionService },
  });

  const { reportData } = await tmetricPlugin.getReport({ reports });

  const prefilledRates = await extractPrefilledRatesFromGenericReport(
    reportData,
    services.expressionService,
  );

  const reportWithRates = applyPrefilledRatesToReport(
    reportData,
    prefilledRates,
  );

  return cacheApi.create({
    periodStart,
    periodEnd,
    scope,
    data: reportWithRates,
  });
}

export function createTmetricDashboardService(
  config: TmetricDashboardServiceConfig,
): TmetricDashboardService {
  const { cacheApi, client, services } = config;

  return {
    resolveContractorsInScope: (scope) =>
      resolveContractorsInScope(config, scope),

    getContractorsInScopeWithIntegrationStatus: async (scope) => {
      const { all } = await resolveContractorsInScope(config, scope);
      return filterContractorsByTmetricIntegration(
        all,
        services.expressionService,
      );
    },

    refreshAndCache: async ({ scope, periodStart, periodEnd }) => {
      const result = await performRefreshAndCache(config, {
        scope,
        periodStart,
        periodEnd,
      });
      client.setQueryData(
        getCacheQueryKey(scope, periodStart, periodEnd),
        result,
      );
      return result;
    },

    useCached: ({ scope, periodStart, periodEnd }) => {
      const enabled =
        periodStart !== null &&
        periodEnd !== null &&
        periodStart.toISOString() <= periodEnd.toISOString() &&
        scope.projectIterationIds?.length > 0;
      const query = maybe.of(
        enabled ? { scope, periodStart, periodEnd } : null,
      );
      return ensureIdleQuery(
        query,
        useQuery(
          {
            queryKey: getCacheQueryKey(scope, periodStart, periodEnd),
            queryFn: async () => {
              try {
                return await cacheApi.getLatestForScope(
                  scope,
                  periodStart!,
                  periodEnd!,
                );
              } catch (e) {
                if (
                  e instanceof Error &&
                  e.message.includes(NO_CACHED_REPORT_MESSAGE)
                ) {
                  return performRefreshAndCache(config, {
                    scope,
                    periodStart: periodStart!,
                    periodEnd: periodEnd!,
                  });
                }
                throw e;
              }
            },
            enabled,
          },
          client,
        ),
      );
    },
  };
}
