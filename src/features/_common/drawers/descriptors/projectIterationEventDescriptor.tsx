import type {
  AccountSpec,
  ProjectIterationDetail,
  ProjectIterationEvent,
} from "@/api/project-iteration/project-iteration.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  createErrorRenderer,
  renderSmallError,
} from "@/features/_common/renderError.tsx";
import { DrawerMainInfoGrid } from "@/features/_common/drawers/DrawerMainInfoGrid.tsx";
import { myRouting } from "@/routing/myRouting.ts";
import { maybe, rd } from "@passionware/monads";
import type {
  DrawerDescriptor,
  DrawerDescriptorServices,
} from "../DrawerDescriptor";
import { useEntityDrawerContext } from "../entityDrawerContext.tsx";

export type ProjectIterationEventSpec = {
  type: "project-iteration-event";
  projectId: number;
  iterationId: number;
  eventId: ProjectIterationEvent["id"];
};

function findEvent(
  detail: ProjectIterationDetail,
  eventId: ProjectIterationEvent["id"],
): ProjectIterationEvent | undefined {
  return detail.events.find((e) => e.id === eventId);
}

function ProjectIterationEventBreadcrumbLabel({
  entity,
  services,
}: {
  entity: ProjectIterationEventSpec;
  services: DrawerDescriptorServices;
}) {
  const detailRd = services.projectIterationService.useProjectIterationDetail(
    maybe.of(entity.iterationId),
  );
  return rd
    .journey(detailRd)
    .wait(<Skeleton className="h-4 w-28" />)
    .catch(renderSmallError("h-4 w-28"))
    .map((detail) => {
      const ev = findEvent(detail, entity.eventId);
      const text =
        ev?.description.trim().slice(0, 48) ||
        `Event ${entity.eventId.slice(0, 8)}`;
      return <>{text}</>;
    });
}

function ProjectIterationEventSmallPreview({
  entity,
  services,
}: {
  entity: ProjectIterationEventSpec;
  services: DrawerDescriptorServices;
}) {
  const detailRd = services.projectIterationService.useProjectIterationDetail(
    maybe.of(entity.iterationId),
  );
  return rd
    .journey(detailRd)
    .wait(<Skeleton className="h-14 w-56" />)
    .catch(renderSmallError("h-14 w-56"))
    .map((detail) => {
      const ev = findEvent(detail, entity.eventId);
      if (!ev) {
        return (
          <span className="text-muted-foreground text-xs">Event not found</span>
        );
      }
      return (
        <DrawerMainInfoGrid
          items={[
            { label: "Moves", value: String(ev.moves.length) },
            {
              label: "Description",
              value:
                ev.description.trim().slice(0, 120) ||
                "—",
            },
          ]}
        />
      );
    });
}

function ProjectIterationEventDrawerBody({
  entity,
  services,
}: {
  entity: ProjectIterationEventSpec;
  services: DrawerDescriptorServices;
}) {
  const { context } = useEntityDrawerContext();
  const detailRd = services.projectIterationService.useProjectIterationDetail(
    maybe.of(entity.iterationId),
  );

  return rd
    .journey(detailRd)
    .wait(
      <div className="space-y-3 p-1">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>,
    )
    .catch(createErrorRenderer("w-full max-w-md"))
    .map((detail) => {
      const ev = findEvent(detail, entity.eventId);
      if (!ev) {
        return (
          <p className="text-sm text-muted-foreground">
            This event is no longer on the iteration.
          </p>
        );
      }
      const computed = services.projectIterationDisplayService.getComputedEvents(
        detail,
      );
      const row = computed.events.find(
        (x) => x.iterationEvent.id === entity.eventId,
      );
      const routingBase = myRouting
        .forWorkspace(context.workspaceId)
        .forClient(context.clientId)
        .forProject(entity.projectId.toString())
        .forIteration(entity.iterationId.toString());

      return (
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              {ev.description.trim() || "Financial event"}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                services.navigationService.navigate(routingBase.events())
              }
            >
              Open in iteration
            </Button>
          </div>
          {row && (
            <DrawerMainInfoGrid
              items={[
                {
                  label: "Iteration balance (after)",
                  value: String(row.balances.iteration.amount),
                },
                {
                  label: "Client balance (after)",
                  value: String(row.balances.client.amount),
                },
                {
                  label: "Cost balance (after)",
                  value: String(row.balances.cost.amount),
                },
              ]}
            />
          )}
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Moves
            </h4>
            <ul className="space-y-2 text-sm">
              {ev.moves.map((move, i) => (
                <li
                  key={`${ev.id}-${i}`}
                  className="rounded-md border border-border/80 bg-muted/30 px-3 py-2"
                >
                  <div className="tabular-nums">
                    <span className="font-medium">
                      {services.formatService.financial.amountWithoutCurrency(
                        move.amount,
                      )}
                    </span>
                    <span className="text-muted-foreground"> × </span>
                    <span>
                      {services.formatService.financial.amountWithoutCurrency(
                        move.unitPrice,
                      )}
                    </span>
                    <span className="text-muted-foreground"> / {move.unit}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span className="font-semibold">
                      {services.formatService.financial.amountWithoutCurrency(
                        move.amount * move.unitPrice,
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {accountLabel(move.from)} → {accountLabel(move.to)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    });
}

function accountLabel(account: AccountSpec): string {
  switch (account.type) {
    case "client":
      return "Client";
    case "iteration":
      return "Iteration";
    case "cost":
      return "Cost";
    case "contractor":
      return `Contractor #${account.contractorId}`;
  }
}

export const projectIterationEventDrawerDescriptor: DrawerDescriptor<ProjectIterationEventSpec> =
  {
    getKey: (entity) =>
      `project-iteration-event:${entity.projectId}:${entity.iterationId}:${entity.eventId}`,
    getLabel: (entity) => `Event ${entity.eventId.slice(0, 8)}`,
    getTitle: () => "Iteration event",
    renderBreadcrumbLabel: (entity, services) => (
      <ProjectIterationEventBreadcrumbLabel entity={entity} services={services} />
    ),
    renderSmallPreview: (entity, services) => (
      <ProjectIterationEventSmallPreview entity={entity} services={services} />
    ),
    renderDrawerContent: (entity, services) => (
      <ProjectIterationEventDrawerBody entity={entity} services={services} />
    ),
  };
