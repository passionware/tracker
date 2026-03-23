import { Project } from "@/api/project/project.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  ActionMenu,
  ActionMenuEditItem,
} from "@/features/_common/ActionMenu.tsx";
import { useEntityDrawerContext } from "@/features/_common/drawers/entityDrawerContext.tsx";
import type { DrawerDescriptorServices } from "@/features/_common/drawers/DrawerDescriptor";
import {
  DrawerHeaderHero,
  DrawerHeaderHeroMetaItem,
  DrawerHeaderHeroSkeleton,
} from "@/features/_common/patterns/DrawerHeaderHero.tsx";
import { renderSmallError } from "@/features/_common/renderError";
import { projectPayloadFromProject } from "@/features/projects/projectPayload.ts";
import { ProjectDetails } from "@/features/projects/widgets/ProjectDetails.tsx";
import { getInitials } from "@/platform/lang/getInitials.ts";
import { myRouting } from "@/routing/myRouting.ts";
import { rd } from "@passionware/monads";
import { ExternalLink } from "lucide-react";

export type ProjectDrawerSpec = { type: "project"; id: number };

function projectStatusVariant(
  status: Project["status"],
): "positive" | "secondary" | "accent1" {
  return (
    {
      active: "positive",
      closed: "secondary",
      draft: "accent1",
    } as const
  )[status];
}

export function ProjectDrawerHeaderPreview({
  projectId,
  services,
}: {
  projectId: number;
  services: DrawerDescriptorServices;
}) {
  const projectRd = services.projectService.useProject(projectId);
  return rd
    .journey(projectRd)
    .wait(<DrawerHeaderHeroSkeleton />)
    .catch(renderSmallError("min-h-16 w-full"))
    .map((project) => (
      <DrawerHeaderHero
        fallbackInitials={getInitials(project.name)}
        title={project.name}
        titleAdornment={
          <Badge variant={projectStatusVariant(project.status)} size="sm">
            {project.status}
          </Badge>
        }
        meta={
          <>
            <DrawerHeaderHeroMetaItem
              label="Project ID"
              value={project.id}
              valueClassName="tabular-nums"
            />
            <DrawerHeaderHeroMetaItem
              label="Client ID"
              value={project.clientId}
              valueClassName="tabular-nums"
            />
          </>
        }
      />
    ));
}

export function ProjectDrawerBreadcrumbLabel({
  entity,
  services,
}: {
  entity: ProjectDrawerSpec;
  services: DrawerDescriptorServices;
}) {
  const projectRd = services.projectService.useProject(entity.id);
  return rd
    .journey(projectRd)
    .wait(<Skeleton className="h-4 w-28" />)
    .catch(renderSmallError("h-4 w-28"))
    .map((project) => <>{project.name}</>);
}

export function ProjectDrawerSmallPreview({
  entity,
  services,
}: {
  entity: ProjectDrawerSpec;
  services: DrawerDescriptorServices;
}) {
  return (
    <ProjectDrawerHeaderPreview projectId={entity.id} services={services} />
  );
}

export function ProjectDrawerHeaderActions({
  entity,
  services,
}: {
  entity: ProjectDrawerSpec;
  services: DrawerDescriptorServices;
}) {
  const { pushEntityDrawer } = useEntityDrawerContext();
  const projectRd = services.projectService.useProject(entity.id);
  const project = rd.tryGet(projectRd);
  if (project == null) {
    return null;
  }
  return (
    <div className="shrink-0" data-no-row-open>
      <ActionMenu services={services}>
        <ActionMenuEditItem
          onClick={() =>
            pushEntityDrawer({
              type: "project-form",
              projectId: project.id,
              defaultValues: projectPayloadFromProject(project),
            })
          }
        >
          Edit project
        </ActionMenuEditItem>
      </ActionMenu>
    </div>
  );
}

export function ProjectDrawerBody({
  entity,
  services,
}: {
  entity: ProjectDrawerSpec;
  services: DrawerDescriptorServices;
}) {
  const { context } = useEntityDrawerContext();
  const projectUrl = myRouting
    .forWorkspace(context.workspaceId)
    .forClient(context.clientId)
    .forProject(entity.id.toString())
    .root();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() =>
            services.navigationService.navigate(projectUrl)
          }
        >
          <ExternalLink className="size-3.5" />
          Open project page
        </Button>
      </div>
      <ProjectDetails
        services={services}
        projectId={entity.id}
        workspaceId={context.workspaceId}
        clientId={context.clientId}
      />
    </div>
  );
}
