import { projectIterationQueryUtils } from "@/api/project-iteration/project-iteration.api.ts";
import { projectQueryUtils } from "@/api/project/project.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import type { CalendarDate } from "@internationalized/date";
import {
  createErrorRenderer,
  renderSmallError,
} from "@/features/_common/renderError.tsx";
import { DrawerMainInfoGrid } from "@/features/_common/drawers/DrawerMainInfoGrid.tsx";
import { DrawerContextEntityStrip } from "@/features/_common/patterns/DrawerContextEntityStrip.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { GenerateReportPopover } from "@/features/project-iterations/widgets/GenerateReportPopover.tsx";
import { ProjectIterationForm } from "@/features/project-iterations/IterationForm.tsx";
import { ProjectIterationDetailActionMenu } from "@/features/project-iterations/widgets/ProjectIterationDetailActionMenu.tsx";
import { ProjectIterationGeneratedReportsPanel } from "@/features/project-iterations/widgets/ProjectIterationGeneratedReportsPanel.tsx";
import { myRouting } from "@/routing/myRouting.ts";
import type { ClientSpec, WorkspaceSpec } from "@/routing/routingUtils.ts";
import { maybe, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  DrawerDescriptor,
  DrawerDescriptorServices,
} from "../DrawerDescriptor";
import { useEntityDrawerContext } from "../entityDrawerContext.tsx";

export type ProjectIterationSpec =
  | {
      type: "project-iteration";
      intent: "detail";
      projectId: number;
      iterationId: number;
    }
  | {
      type: "project-iteration";
      intent: "create";
      /** When set, the form targets this project and hides the project field. */
      projectId?: number;
      /**
       * When `projectId` is omitted, the user picks a project; narrows the list
       * (e.g. timeline client lane). Defaults to drawer route `clientId`.
       */
      presetClientId?: number;
      /** Stable key so multiple create drawers stack with distinct entries */
      draftKey: string;
      periodStart?: CalendarDate;
      periodEnd?: CalendarDate;
      /**
       * After successful create: default opens the iteration route; `drawer-detail` replaces this
       * drawer with iteration detail (e.g. timeline draw-to-create).
       */
      afterCreate?: "navigate-iteration" | "drawer-detail";
    };

/** Stable key for persisting last-picked project (workspace + client scope). */
function newIterationProjectScopeKey(
  workspaceId: WorkspaceSpec,
  presetClientId: number | undefined,
  routeClientId: ClientSpec,
): string {
  const w = idSpecUtils.isAll(workspaceId) ? "all" : String(workspaceId);
  if (presetClientId != null) {
    return `${w}:${presetClientId}`;
  }
  const c = idSpecUtils.isAll(routeClientId) ? "all" : String(routeClientId);
  return `${w}:${c}`;
}

function statusVariant(
  status: "draft" | "active" | "closed",
): "secondary" | "positive" | "destructive" {
  return (
    {
      draft: "secondary",
      active: "positive",
      closed: "destructive",
    } as const
  )[status];
}

function ProjectIterationBreadcrumbLabel({
  entity,
  services,
}: {
  entity: Extract<ProjectIterationSpec, { intent: "detail" }>;
  services: DrawerDescriptorServices;
}) {
  const detailRd = services.projectIterationService.useProjectIterationDetail(
    maybe.of(entity.iterationId),
  );
  return rd
    .journey(detailRd)
    .wait(<Skeleton className="h-4 w-28" />)
    .catch(renderSmallError("h-4 w-28"))
    .map((detail) => (
      <>
        <span className="tabular-nums">{detail.ordinalNumber}.</span>
        <span className="ml-1 text-muted-foreground">
          {services.formatService.temporal.range.compact(
            detail.periodStart,
            detail.periodEnd,
          )}
        </span>
      </>
    ));
}

function ProjectIterationSmallPreview({
  entity,
  services,
}: {
  entity: Extract<ProjectIterationSpec, { intent: "detail" }>;
  services: DrawerDescriptorServices;
}) {
  const detailRd = services.projectIterationService.useProjectIterationDetail(
    maybe.of(entity.iterationId),
  );
  return rd
    .journey(detailRd)
    .wait(<Skeleton className="h-14 w-56" />)
    .catch(renderSmallError("h-14 w-56"))
    .map((detail) => (
      <DrawerMainInfoGrid
        items={[
          {
            label: "Status",
            value: (
              <Badge variant={statusVariant(detail.status)} tone="secondary" size="sm">
                {detail.status}
              </Badge>
            ),
          },
          { label: "Events", value: String(detail.events.length) },
          { label: "Positions", value: String(detail.positions.length) },
        ]}
      />
    ));
}

function ProjectIterationCreateContextStrip({
  entity,
  services,
}: {
  entity: Extract<ProjectIterationSpec, { intent: "create" }>;
  services: DrawerDescriptorServices;
}) {
  const { context, pushEntityDrawer } = useEntityDrawerContext();
  const workspaceMaybe = idSpecUtils.isSpecific(context.workspaceId)
    ? maybe.of(context.workspaceId as number)
    : maybe.ofAbsent();
  const clientIdResolved =
    entity.presetClientId ??
    (idSpecUtils.isSpecific(context.clientId)
      ? (context.clientId as number)
      : null);

  return (
    <DrawerContextEntityStrip
      services={services}
      workspaceId={workspaceMaybe}
      clientId={clientIdResolved}
      onOpenClientDetails={(id) => pushEntityDrawer?.({ type: "client", id })}
    />
  );
}

function ProjectIterationDetailContextStrip({
  projectId,
  services,
}: {
  projectId: number;
  services: DrawerDescriptorServices;
}) {
  const { context, pushEntityDrawer } = useEntityDrawerContext();
  const projectRd = services.projectService.useProject(maybe.of(projectId));
  const workspaceIdMaybe = useMemo(() => {
    const p = rd.tryGet(projectRd);
    if (!p?.workspaceIds?.length) return maybe.ofAbsent();
    if (idSpecUtils.isSpecific(context.workspaceId)) {
      const w = context.workspaceId as number;
      if (p.workspaceIds.includes(w)) return maybe.of(w);
    }
    return maybe.of(p.workspaceIds[0]);
  }, [projectRd, context.workspaceId]);
  const workspaceRd = services.workspaceService.useWorkspace(workspaceIdMaybe);

  if (rd.isPending(projectRd) || rd.isPending(workspaceRd)) {
    return (
      <div className="mb-4">
        <Skeleton className="h-16 w-full rounded-md border border-border bg-muted/30" />
      </div>
    );
  }

  const project = rd.tryGet(projectRd);
  const workspace = rd.tryGet(workspaceRd);
  if (!project || workspace == null) {
    return null;
  }

  return (
    <DrawerContextEntityStrip
      services={services}
      workspace={workspace}
      clientId={project.clientId}
      onOpenClientDetails={(id) => pushEntityDrawer?.({ type: "client", id })}
    />
  );
}

function ProjectIterationCreateDrawerBody({
  entity,
  services,
}: {
  entity: Extract<ProjectIterationSpec, { intent: "create" }>;
  services: DrawerDescriptorServices;
}) {
  const { context, popEntityDrawer, replaceEntityDrawerTop } =
    useEntityDrawerContext();
  const fixedProjectId =
    entity.projectId != null && entity.projectId > 0
      ? entity.projectId
      : undefined;
  const needsProjectPicker = fixedProjectId === undefined;
  const [chosenProjectId, setChosenProjectId] = useState(0);
  const activeProjectId = fixedProjectId ?? chosenProjectId;

  const scopeKey = useMemo(
    () =>
      newIterationProjectScopeKey(
        context.workspaceId,
        entity.presetClientId,
        context.clientId,
      ),
    [context.workspaceId, context.clientId, entity.presetClientId],
  );

  const [preferenceReady, setPreferenceReady] = useState(!needsProjectPicker);

  useEffect(() => {
    if (!needsProjectPicker) return;
    setChosenProjectId(0);
  }, [entity.draftKey, needsProjectPicker]);

  const projectsQuery = useMemo(
    () =>
      needsProjectPicker
        ? maybe.of(
            projectQueryUtils.getBuilder().build((q) => [
              q.withEnsureDefault({
                workspaceId: context.workspaceId,
                clientId: entity.presetClientId ?? context.clientId,
              }),
              (q2) => projectQueryUtils.setPageSize(q2, 500),
            ]),
          )
        : maybe.ofAbsent(),
    [
      needsProjectPicker,
      context.workspaceId,
      context.clientId,
      entity.presetClientId,
    ],
  );

  const projectsRd = services.projectService.useProjects(projectsQuery);

  /** Avoid re-running last-project preference when `projectsRd` is a new RemoteData instance each render (same list). */
  const lastAppliedPreferenceKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!needsProjectPicker) {
      lastAppliedPreferenceKeyRef.current = null;
      setPreferenceReady(true);
      return;
    }
    if (rd.isPending(projectsRd)) {
      setPreferenceReady(false);
      return;
    }
    if (!rd.isSuccess(projectsRd)) {
      lastAppliedPreferenceKeyRef.current = null;
      setPreferenceReady(true);
      return;
    }
    const list = projectsRd.data;
    if (list.length === 0) {
      lastAppliedPreferenceKeyRef.current = null;
      setPreferenceReady(true);
      return;
    }
    const preferenceKey = `${entity.draftKey}|${scopeKey}|${list.map((p) => p.id).join(",")}`;
    if (lastAppliedPreferenceKeyRef.current === preferenceKey) {
      setPreferenceReady(true);
      return;
    }
    let cancelled = false;
    setPreferenceReady(false);
    void services.preferenceService
      .getLastProjectForNewIteration(scopeKey)
      .then((id) => {
        if (cancelled) return;
        if (id != null && list.some((p) => p.id === id)) {
          setChosenProjectId(id);
        }
        lastAppliedPreferenceKeyRef.current = preferenceKey;
        setPreferenceReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [
    needsProjectPicker,
    scopeKey,
    entity.draftKey,
    projectsRd,
    services.preferenceService,
  ]);

  const projectChoices = useMemo(() => {
    if (!needsProjectPicker) return undefined;
    const list = rd.tryGet(projectsRd);
    if (!list) return undefined;
    return list.map((p) => ({ id: p.id, label: p.name }));
  }, [needsProjectPicker, projectsRd]);

  const iterationsQuery = useMemo(
    () =>
      activeProjectId > 0
        ? maybe.of(
            projectIterationQueryUtils.getBuilder().build((q) => [
              q.withFilter("projectId", {
                operator: "oneOf",
                value: [activeProjectId],
              }),
            ]),
          )
        : maybe.ofAbsent(),
    [activeProjectId],
  );

  const projectIterations =
    services.projectIterationService.useProjectIterations(iterationsQuery);

  const lastIteration = rd.map(projectIterations, (iters) => {
    if (iters.length === 0) return null;
    const sorted = [...iters].sort((a, b) => b.ordinalNumber - a.ordinalNumber);
    return sorted[0];
  });
  const lastIterationId = rd.getOrElse(lastIteration, () => null)?.id ?? null;
  const initialTarget = rd.getOrElse(
    services.iterationTriggerService.useCurrentBudgetTarget(lastIterationId),
    () => undefined,
  );

  const defaultOrdinal =
    (rd.getOrElse(lastIteration, () => null)?.ordinalNumber ?? 0) + 1;

  const promise = promiseState.useMutation(
    services.mutationService.createProjectIteration,
  );

  if (needsProjectPicker && rd.isPending(projectsRd)) {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-1">
        <ProjectIterationCreateContextStrip entity={entity} services={services} />
        <Skeleton className="h-40 w-full max-w-md" />
      </div>
    );
  }

  if (needsProjectPicker && projectChoices && projectChoices.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-1">
        <ProjectIterationCreateContextStrip entity={entity} services={services} />
        <p className="text-sm text-muted-foreground">
          No projects available for this client.
        </p>
      </div>
    );
  }

  const awaitingLastProjectPreference =
    needsProjectPicker &&
    rd.isSuccess(projectsRd) &&
    projectsRd.data.length > 0 &&
    !preferenceReady;

  if (awaitingLastProjectPreference) {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-1">
        <ProjectIterationCreateContextStrip entity={entity} services={services} />
        <Skeleton className="h-40 w-full max-w-md" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-1">
      <ProjectIterationCreateContextStrip entity={entity} services={services} />
      <ProjectIterationForm
        mode="create"
        onCancel={() => popEntityDrawer?.()}
        projectChoices={projectChoices}
        onProjectIdChange={
          needsProjectPicker ? (id) => setChosenProjectId(id) : undefined
        }
        hintOrdinalNumber={
          activeProjectId > 0 && rd.isSuccess(projectIterations)
            ? defaultOrdinal
            : undefined
        }
        hintBudgetTriggerAmount={
          activeProjectId > 0 && rd.isSuccess(projectIterations)
            ? (initialTarget ?? null)
            : undefined
        }
        defaultValues={{
          projectId: activeProjectId,
          status: "active",
          ordinalNumber: activeProjectId > 0 ? defaultOrdinal : 1,
          budgetTriggerAmount: initialTarget,
          ...(entity.periodStart && entity.periodEnd
            ? {
                periodStart: entity.periodStart,
                periodEnd: entity.periodEnd,
              }
            : {}),
        }}
        onSubmit={async (data, _changes, extra) => {
          const response = await promise.track(data);
          if (extra?.budgetTriggerAmount != null) {
            await services.mutationService.logBudgetTargetChange(
              response.id,
              extra.budgetTriggerAmount,
              undefined,
            );
          }
          void services.preferenceService.setLastProjectForNewIteration(
            scopeKey,
            data.projectId,
          );
          const detailEntity = {
            type: "project-iteration" as const,
            intent: "detail" as const,
            projectId: data.projectId,
            iterationId: response.id,
          };
          if (entity.afterCreate === "drawer-detail") {
            replaceEntityDrawerTop(detailEntity);
          } else {
            popEntityDrawer?.();
            services.navigationService.navigate(
              myRouting
                .forWorkspace(context.workspaceId)
                .forClient(context.clientId)
                .forProject(data.projectId.toString())
                .forIteration(response.id.toString())
                .root(),
            );
          }
        }}
      />
    </div>
  );
}

function ProjectIterationDetailDrawerBody({
  entity,
  services,
}: {
  entity: Extract<ProjectIterationSpec, { intent: "detail" }>;
  services: DrawerDescriptorServices;
}) {
  const { context } = useEntityDrawerContext();
  const detailRd = services.projectIterationService.useProjectIterationDetail(
    maybe.of(entity.iterationId),
  );
  const routingBase = myRouting
    .forWorkspace(context.workspaceId)
    .forClient(context.clientId)
    .forProject(entity.projectId.toString())
    .forIteration(entity.iterationId.toString());

  return rd
    .journey(detailRd)
    .wait(
      <div className="space-y-3 p-1">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>,
    )
    .catch(createErrorRenderer("w-full max-w-md"))
    .map((detail) => (
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-1">
        <ProjectIterationDetailContextStrip
          projectId={entity.projectId}
          services={services}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">Iteration</span>
            <Badge variant={statusVariant(detail.status)} tone="secondary" size="sm">
              {detail.ordinalNumber}.
            </Badge>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                services.navigationService.navigate(routingBase.root())
              }
            >
              Open iteration
            </Button>
            <GenerateReportPopover
              triggerClassName="shrink-0"
              projectIterationId={entity.iterationId}
              workspaceId={context.workspaceId}
              clientId={context.clientId}
              services={services}
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {services.formatService.temporal.range.long(
            detail.periodStart,
            detail.periodEnd,
          )}
        </p>
        {detail.description?.trim() ? (
          <p className="text-sm text-foreground">{detail.description.trim()}</p>
        ) : null}
        <DrawerMainInfoGrid
          items={[
            { label: "Currency", value: detail.currency },
            { label: "Events", value: String(detail.events.length) },
            { label: "Positions", value: String(detail.positions.length) },
          ]}
        />
        <ProjectIterationGeneratedReportsPanel
          services={services}
          workspaceId={context.workspaceId}
          clientId={context.clientId}
          projectId={entity.projectId}
          projectIterationId={entity.iterationId}
        />
      </div>
    ));
}

function ProjectIterationDrawerHeaderActions({
  entity,
  services,
}: {
  entity: Extract<ProjectIterationSpec, { intent: "detail" }>;
  services: DrawerDescriptorServices;
}) {
  const { context, closeEntityDrawer } = useEntityDrawerContext();
  return (
    <ProjectIterationDetailActionMenu
      services={services}
      workspaceId={context.workspaceId}
      clientId={context.clientId}
      projectId={entity.projectId}
      projectIterationId={entity.iterationId}
      onAfterDelete={() => closeEntityDrawer()}
    />
  );
}

export const projectIterationDrawerDescriptor: DrawerDescriptor<ProjectIterationSpec> =
  {
    getKey: (entity) =>
      entity.intent === "create"
        ? `project-iteration:create:${entity.draftKey}`
        : `project-iteration:detail:${entity.projectId}:${entity.iterationId}`,
    getLabel: (entity) =>
      entity.intent === "create"
        ? "New iteration"
        : `Iteration #${entity.iterationId}`,
    getTitle: (entity) =>
      entity.intent === "create" ? "New iteration" : "Iteration",
    renderBreadcrumbLabel: (entity, services) =>
      entity.intent === "create" ? (
        <>New iteration</>
      ) : (
        <ProjectIterationBreadcrumbLabel entity={entity} services={services} />
      ),
    renderSmallPreview: (entity, services) =>
      entity.intent === "create" ? null : (
        <ProjectIterationSmallPreview entity={entity} services={services} />
      ),
    renderDrawerContent: (entity, services) =>
      entity.intent === "create" ? (
        <ProjectIterationCreateDrawerBody entity={entity} services={services} />
      ) : (
        <ProjectIterationDetailDrawerBody entity={entity} services={services} />
      ),
    renderHeaderActions: (entity, services) =>
      entity.intent === "detail" ? (
        <ProjectIterationDrawerHeaderActions entity={entity} services={services} />
      ) : null,
  };
