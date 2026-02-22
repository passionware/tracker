import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api";
import type { Project } from "@/api/project/project.api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { WithFrontServices } from "@/core/frontServices";
import { ClientWidget } from "@/features/_common/elements/pickers/ClientView";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView";
import { calendarDateToJSDate } from "@/platform/lang/internationalized-date";
import type { GenericReport, RoleRate } from "@/services/io/_common/GenericReport";
import { maybe, rd, type RemoteData } from "@passionware/monads";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface ContractorRateInProject {
  contractorId: number;
  costRate: number;
  costCurrency: string;
  billingRate: number;
  billingCurrency: string;
}

export interface TmetricScopeHierarchyPanelProps {
  services: WithFrontServices["services"];
  projectsData: RemoteData<Project[]>;
  iterationsForScope: ProjectIteration[];
  projectsMap: Map<number, { name: string }>;
  /** When present (cached report loaded), contractor rates per project are shown. */
  cachedReport?: { data: GenericReport } | null;
}

/** Resolve report project type id by project name (e.g. for matching rates). */
function findReportProjectIdByName(
  report: GenericReport,
  projectName: string,
): string | null {
  const normalized = projectName.trim().toLowerCase();
  const entry = Object.entries(report.definitions.projectTypes).find(
    ([, pt]) => pt.name.trim().toLowerCase() === normalized,
  );
  return entry ? entry[0] : null;
}

/** Get the best matching rate for a project: project-specific first, then default (empty projectIds). */
function getBestRateForProject(
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
 * Returns contractor rates applicable to the given project in the report.
 * Report role types are keyed by contractor_<id>; each has rates (optionally per project).
 */
function getContractorRatesForProject(
  report: GenericReport,
  projectName: string,
): ContractorRateInProject[] {
  const reportProjectId = findReportProjectIdByName(report, projectName);
  const result: ContractorRateInProject[] = [];
  for (const [roleKey, roleType] of Object.entries(
    report.definitions.roleTypes,
  )) {
    const match = /^contractor_(\d+)$/.exec(roleKey);
    if (!match) continue;
    const contractorId = Number(match[1]);
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

function buildScopeHierarchy(
  projectsData: RemoteData<Project[]>,
  iterationsForScope: ProjectIteration[],
  projectsMap: Map<number, { name: string }>,
) {
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

function projectKey(iterationId: number, projectName: string): string {
  return `${iterationId}-${projectName}`;
}

function formatRate(rate: number, currency: string): string {
  return `${Number(rate) === Math.round(rate) ? rate : rate.toFixed(2)} ${currency}`;
}

export function TmetricScopeHierarchyPanel({
  services,
  projectsData,
  iterationsForScope,
  projectsMap,
  cachedReport = null,
}: TmetricScopeHierarchyPanelProps) {
  const scopeHierarchy = useMemo(
    () =>
      buildScopeHierarchy(
        projectsData,
        iterationsForScope,
        projectsMap,
      ),
    [projectsData, iterationsForScope, projectsMap],
  );

  const scopeHierarchyWithRates = useMemo(() => {
    return scopeHierarchy.map((client) => ({
      ...client,
      iterations: client.iterations.map((row) => ({
        ...row,
        contractorsWithRates: cachedReport?.data
          ? getContractorRatesForProject(
              cachedReport.data,
              row.projectName,
            )
          : [],
      })),
    }));
  }, [scopeHierarchy, cachedReport]);

  const allClientIds = useMemo(
    () => scopeHierarchyWithRates.map((c) => c.clientId),
    [scopeHierarchyWithRates],
  );
  const allIterationIds = useMemo(
    () =>
      scopeHierarchyWithRates.flatMap((c) =>
        c.iterations.map((i) => i.iteration.id),
      ),
    [scopeHierarchyWithRates],
  );
  const allProjectKeys = useMemo(
    () =>
      scopeHierarchyWithRates.flatMap((c) =>
        c.iterations.map((i) => projectKey(i.iteration.id, i.projectName)),
      ),
    [scopeHierarchyWithRates],
  );

  const [expandedClients, setExpandedClients] = useState<Set<number>>(
    () => new Set(),
  );
  const [expandedIterations, setExpandedIterations] = useState<Set<number>>(
    () => new Set(),
  );
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    setExpandedClients(new Set());
    setExpandedIterations(new Set());
    setExpandedProjects(new Set());
  }, [allClientIds, allIterationIds, allProjectKeys]);

  const expandAll = useCallback(() => {
    setExpandedClients(new Set(allClientIds));
    setExpandedIterations(new Set(allIterationIds));
    setExpandedProjects(new Set(allProjectKeys));
  }, [allClientIds, allIterationIds, allProjectKeys]);

  const collapseAll = useCallback(() => {
    setExpandedClients(new Set());
    setExpandedIterations(new Set());
    setExpandedProjects(new Set());
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">
            Scope: Clients → Iterations → Projects → Contractors & rates
          </CardTitle>
          <CardDescription>
            Hierarchy of current dashboard scope; contractor rates when report is
            loaded
          </CardDescription>
        </div>
        {scopeHierarchy.length > 0 && (
          <div className="flex shrink-0 gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={expandAll}
              className="gap-1"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              Expand all
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={collapseAll}
              className="gap-1"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              Collapse all
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {scopeHierarchyWithRates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No clients, iterations, or projects in scope.
            </p>
          ) : (
            scopeHierarchyWithRates.map(({ clientId, iterations }) => (
              <Collapsible
                key={clientId}
                open={expandedClients.has(clientId)}
                onOpenChange={(open) =>
                  setExpandedClients((prev) => {
                    const next = new Set(prev);
                    if (open) next.add(clientId);
                    else next.delete(clientId);
                    return next;
                  })
                }
                className="group"
              >
                <div className="rounded-md border">
                  <CollapsibleTrigger asChild>
                    <div className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-muted/50">
                      <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
                      <ClientWidget
                        clientId={maybe.of(clientId)}
                        services={services}
                        layout="full"
                        size="sm"
                      />
                      <span className="text-muted-foreground">
                        {iterations.length} iteration(s)
                      </span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t bg-muted/20">
                      {iterations.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No iterations
                        </div>
                      ) : (
                        iterations.map(
                          ({
                            iteration,
                            iterationLabel,
                            projectName,
                            contractorsWithRates,
                          }) => {
                            const pk = projectKey(iteration.id, projectName);
                            const hasRates =
                              contractorsWithRates &&
                              contractorsWithRates.length > 0;
                            return (
                              <Collapsible
                                key={iteration.id}
                                open={expandedIterations.has(iteration.id)}
                                onOpenChange={(open) =>
                                  setExpandedIterations((prev) => {
                                    const next = new Set(prev);
                                    if (open) next.add(iteration.id);
                                    else next.delete(iteration.id);
                                    return next;
                                  })
                                }
                                className="group"
                              >
                                <div className="border-b border-border/50 last:border-b-0">
                                  <CollapsibleTrigger asChild>
                                    <div className="flex cursor-pointer items-center gap-2 px-4 py-2 pl-7 hover:bg-muted/30">
                                      <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
                                      <span className="text-sm font-medium">
                                        {iterationLabel}
                                      </span>
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="bg-background px-4 py-2 pl-11 text-sm">
                                      <div className="text-muted-foreground">
                                        Project: {projectName}
                                      </div>
                                      {hasRates && (
                                        <Collapsible
                                          open={expandedProjects.has(pk)}
                                          onOpenChange={(open) =>
                                            setExpandedProjects((prev) => {
                                              const next = new Set(prev);
                                              if (open) next.add(pk);
                                              else next.delete(pk);
                                              return next;
                                            })
                                          }
                                          className="group mt-2"
                                        >
                                          <div className="rounded border border-border/50">
                                            <CollapsibleTrigger asChild>
                                              <div className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-muted/30">
                                                <ChevronRight className="h-3 w-3 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
                                                <span className="text-xs font-medium text-muted-foreground">
                                                  Contractors & rates (
                                                  {contractorsWithRates.length})
                                                </span>
                                              </div>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                              <div className="border-t border-border/50 px-3 py-2 space-y-2">
                                                {contractorsWithRates.map(
                                                  (r) => (
                                                    <div
                                                      key={r.contractorId}
                                                      className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
                                                    >
                                                      <ContractorWidget
                                                        contractorId={maybe.of(
                                                          r.contractorId,
                                                        )}
                                                        services={services}
                                                        layout="full"
                                                        size="sm"
                                                        className="min-w-0"
                                                      />
                                                      <span className="text-muted-foreground shrink-0">
                                                        Cost:{" "}
                                                        {formatRate(
                                                          r.costRate,
                                                          r.costCurrency,
                                                        )}{" "}
                                                        · Billing:{" "}
                                                        {formatRate(
                                                          r.billingRate,
                                                          r.billingCurrency,
                                                        )}
                                                      </span>
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            </CollapsibleContent>
                                          </div>
                                        </Collapsible>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            );
                          },
                        )
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
