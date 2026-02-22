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
import { calendarDateToJSDate } from "@/platform/lang/internationalized-date";
import { maybe, rd, type RemoteData } from "@passionware/monads";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface TmetricScopeHierarchyPanelProps {
  services: WithFrontServices["services"];
  projectsData: RemoteData<Project[]>;
  iterationsForScope: ProjectIteration[];
  projectsMap: Map<number, { name: string }>;
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

export function TmetricScopeHierarchyPanel({
  services,
  projectsData,
  iterationsForScope,
  projectsMap,
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

  const allClientIds = useMemo(
    () => scopeHierarchy.map((c) => c.clientId),
    [scopeHierarchy],
  );
  const allIterationIds = useMemo(
    () =>
      scopeHierarchy.flatMap((c) => c.iterations.map((i) => i.iteration.id)),
    [scopeHierarchy],
  );

  const [expandedClients, setExpandedClients] = useState<Set<number>>(
    () => new Set(),
  );
  const [expandedIterations, setExpandedIterations] = useState<Set<number>>(
    () => new Set(),
  );

  useEffect(() => {
    setExpandedClients(new Set());
    setExpandedIterations(new Set());
  }, [allClientIds, allIterationIds]);

  const expandAll = useCallback(() => {
    setExpandedClients(new Set(allClientIds));
    setExpandedIterations(new Set(allIterationIds));
  }, [allClientIds, allIterationIds]);

  const collapseAll = useCallback(() => {
    setExpandedClients(new Set());
    setExpandedIterations(new Set());
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">
            Scope: Clients → Iterations → Projects
          </CardTitle>
          <CardDescription>
            Hierarchy of current dashboard scope
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
          {scopeHierarchy.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No clients, iterations, or projects in scope.
            </p>
          ) : (
            scopeHierarchy.map(({ clientId, iterations }) => (
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
                          }) => (
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
                                  <div className="bg-background px-4 py-2 pl-11 text-sm text-muted-foreground">
                                    Project: {projectName}
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          ),
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
