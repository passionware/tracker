import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  ActionMenu,
  ActionMenuEditItem,
} from "@/features/_common/ActionMenu.tsx";
import { useEntityDrawerContext } from "@/features/_common/drawers/entityDrawerContext.tsx";
import { DrawerMainInfoGrid } from "@/features/_common/drawers/DrawerMainInfoGrid.tsx";
import type { DrawerDescriptorServices } from "@/features/_common/drawers/DrawerDescriptor";
import { PanelSectionLabel } from "@/features/_common/patterns/PanelSectionLabel.tsx";
import { SurfaceCard } from "@/features/_common/patterns/SurfaceCard.tsx";
import { WorkspaceHiddenBadge } from "@/features/workspaces/WorkspaceHiddenBadge.tsx";
import { renderSmallError } from "@/features/_common/renderError";
import { getInitials } from "@/platform/lang/getInitials.ts";
import { rd } from "@passionware/monads";
import { Building2 } from "lucide-react";

export type WorkspaceDrawerSpec = { type: "workspace"; id: number };

export function WorkspaceDrawerHeaderPreview({
  workspaceId,
  services,
}: {
  workspaceId: number;
  services: DrawerDescriptorServices;
}) {
  const workspaceRd = services.workspaceService.useWorkspace(workspaceId);
  return rd
    .journey(workspaceRd)
    .wait(
      <div className="flex gap-3">
        <Skeleton className="size-14 shrink-0 rounded-lg" />
        <Skeleton className="h-16 min-w-0 flex-1" />
      </div>,
    )
    .catch(renderSmallError("min-h-16 w-full"))
    .map((workspace) => (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Avatar className="size-14 shrink-0 rounded-lg">
          {workspace.avatarUrl ? (
            <AvatarImage src={workspace.avatarUrl} alt="" />
          ) : null}
          <AvatarFallback className="rounded-lg text-base">
            {getInitials(workspace.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <DrawerMainInfoGrid
            items={[
              {
                label: "Name",
                value: (
                  <span className="flex w-full min-w-0 items-center gap-2">
                    <span className="min-w-0 flex-1 truncate">
                      {workspace.name}
                    </span>
                    <WorkspaceHiddenBadge hidden={workspace.hidden} />
                  </span>
                ),
              },
              { label: "Slug", value: workspace.slug },
              { label: "Workspace ID", value: workspace.id.toString() },
            ]}
          />
        </div>
      </div>
    ));
}

export function WorkspaceDrawerBreadcrumbLabel({
  entity,
  services,
}: {
  entity: WorkspaceDrawerSpec;
  services: DrawerDescriptorServices;
}) {
  const workspaceRd = services.workspaceService.useWorkspace(entity.id);
  return rd
    .journey(workspaceRd)
    .wait(<Skeleton className="h-4 w-28" />)
    .catch(renderSmallError("h-4 w-28"))
    .map((workspace) => <>{workspace.name}</>);
}

export function WorkspaceDrawerSmallPreview({
  entity,
  services,
}: {
  entity: WorkspaceDrawerSpec;
  services: DrawerDescriptorServices;
}) {
  return (
    <WorkspaceDrawerHeaderPreview
      workspaceId={entity.id}
      services={services}
    />
  );
}

export function WorkspaceDrawerHeaderActions({
  entity,
  services,
}: {
  entity: WorkspaceDrawerSpec;
  services: DrawerDescriptorServices;
}) {
  const { pushEntityDrawer } = useEntityDrawerContext();
  const workspaceRd = services.workspaceService.useWorkspace(entity.id);
  const workspace = rd.tryGet(workspaceRd);
  if (workspace == null) {
    return null;
  }
  return (
    <div className="shrink-0" data-no-row-open>
      <ActionMenu services={services}>
        <ActionMenuEditItem
          onClick={() =>
            pushEntityDrawer({
              type: "workspace-form",
              workspaceId: workspace.id,
              defaultValues: {
                name: workspace.name,
                slug: workspace.slug,
                avatarUrl: workspace.avatarUrl ?? null,
                hidden: workspace.hidden,
              },
            })
          }
        >
          Edit workspace
        </ActionMenuEditItem>
      </ActionMenu>
    </div>
  );
}

export function WorkspaceDrawerBody({
  entity,
  services,
}: {
  entity: WorkspaceDrawerSpec;
  services: DrawerDescriptorServices;
}) {
  const workspaceRd = services.workspaceService.useWorkspace(entity.id);

  return rd
    .journey(workspaceRd)
    .wait(
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>,
    )
    .catch(renderSmallError("min-h-32 w-full"))
    .map((workspace) => (
      <SurfaceCard className="space-y-3">
        <PanelSectionLabel icon={Building2}>Workspace</PanelSectionLabel>
        <DrawerMainInfoGrid
          items={[
            {
              label: "Name",
              value: (
                <span className="flex w-full min-w-0 items-center gap-2">
                  <span className="min-w-0 flex-1 truncate">
                    {workspace.name}
                  </span>
                  <WorkspaceHiddenBadge hidden={workspace.hidden} />
                </span>
              ),
            },
            {
              label: "Slug",
              value: <span className="font-mono">{workspace.slug}</span>,
            },
            { label: "ID", value: workspace.id.toString() },
          ]}
        />
      </SurfaceCard>
    ));
}
