import { Project } from "@/api/project/project.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import {
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { makeRelativePath } from "@/platform/lang/makeRelativePath.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { rd, RemoteData } from "@passionware/monads";
import { Route, Routes } from "react-router-dom";

export interface ProjectBreadcrumbProps extends WithFrontServices {
  project: RemoteData<Project>;
  projectId: Project["id"];
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
}

export function ProjectBreadcrumbView(props: ProjectBreadcrumbProps) {
  const basePath = props.services.routingService
    .forWorkspace()
    .forClient()
    .forProject()
    .root();

  return (
    <>
      <BreadcrumbLink>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="px-2 -mx-2">
              {rd
                .journey(props.project)
                .wait(<Skeleton className="w-20 h-4" />)
                .catch(renderSmallError("w-20 h-4"))
                .map((x) => x.name)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem
              onClick={() =>
                props.services.navigationService.navigate(
                  props.services.routingService
                    .forWorkspace(props.workspaceId)
                    .forClient(props.clientId)
                    .forProject(props.projectId.toString())
                    .iterations("all"),
                )
              }
            >
              Iterations
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                props.services.navigationService.navigate(
                  props.services.routingService
                    .forWorkspace(props.workspaceId)
                    .forClient(props.clientId)
                    .forProject(props.projectId.toString())
                    .reports(),
                )
              }
            >
              Reports
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                props.services.navigationService.navigate(
                  props.services.routingService
                    .forWorkspace(props.workspaceId)
                    .forClient(props.clientId)
                    .forProject(props.projectId.toString())
                    .configuration(),
                )
              }
            >
              Configuration
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </BreadcrumbLink>
      <BreadcrumbSeparator />
      <BreadcrumbPage>
        <Routes>
          <Route
            path={makeRelativePath(
              basePath,
              props.services.routingService
                .forWorkspace()
                .forClient()
                .forProject()
                .iterations(),
            )}
            element="Iterations"
          />
          <Route
            path={makeRelativePath(
              basePath,
              props.services.routingService
                .forWorkspace()
                .forClient()
                .forProject()
                .forIteration()
                .root(),
            )}
            element={<IterationBreadcrumb services={props.services} />}
          />
          <Route
            path={makeRelativePath(
              basePath,
              props.services.routingService
                .forWorkspace()
                .forClient()
                .forProject()
                .reports(),
            )}
            element="Reports"
          />
          <Route
            path={makeRelativePath(
              basePath,
              props.services.routingService
                .forWorkspace()
                .forClient()
                .forProject()
                .configuration(),
            )}
            element="Configuration"
          />
        </Routes>
      </BreadcrumbPage>
    </>
  );
}

function IterationBreadcrumb(props: WithFrontServices) {
  const currentIteration =
    props.services.locationService.useCurrentProjectIterationId();
  const iteration =
    props.services.projectIterationService.useProjectIterationDetail(
      currentIteration,
    );
  return (
    <BreadcrumbPage>
      {rd
        .journey(iteration)
        .wait(<Skeleton className="w-20 h-4" />)
        .catch(renderSmallError("w-20 h-4"))
        .map((x) => (
          <div className="flex items-center space-x-2">
            <div>Iteration</div>
            <Badge
              variant={
                (
                  {
                    draft: "secondary",
                    active: "positive",
                    closed: "destructive",
                  } as const
                )[x.status]
              }
            >
              {x.ordinalNumber}.
            </Badge>
            {props.services.formatService.temporal.range.long(
              x.periodStart,
              x.periodEnd,
            )}
          </div>
        ))}
    </BreadcrumbPage>
  );
}
