import { Project } from "@/api/project/project.api.ts";
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
import { ChevronsUpDown } from "lucide-react";
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
        {rd
          .journey(props.project)
          .wait(<Skeleton className="w-20 h-4" />)
          .catch(renderSmallError("w-20 h-4"))
          .map((x) => x.name)}
      </BreadcrumbLink>
      <BreadcrumbSeparator />
      <BreadcrumbPage>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="px-2 -mx-2 group">
              <Routes>
                <Route
                  path={makeRelativePath(
                    basePath,
                    props.services.routingService
                      .forWorkspace()
                      .forClient()
                      .forProject()
                      .root(),
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
              <ChevronsUpDown className="size-4 opacity-0 group-hocus:opacity-100" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                props.services.navigationService.navigate(
                  props.services.routingService
                    .forWorkspace(props.workspaceId)
                    .forClient(props.clientId)
                    .forProject(props.projectId.toString())
                    .root(),
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
      </BreadcrumbPage>
    </>
  );
}
