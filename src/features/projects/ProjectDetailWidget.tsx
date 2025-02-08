import { Project } from "@/api/project/project.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { PopoverHeader } from "@/components/ui/popover.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { ProjectBreadcrumbView } from "@/features/_common/elements/breadcrumbs/ProjectBreadcrumb.tsx";
import { ProjectListBreadcrumb } from "@/features/_common/elements/breadcrumbs/ProjectListBreadcrumb.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { ProjectForm } from "@/features/projects/_common/ProjectForm.tsx";
import { ProjectConfigurationWidget } from "@/features/projects/configuration/ProjectConfigurationWidget.tsx";
import { ProjectIterationListWidget } from "@/features/projects/iterations/ProjectIterationListWidget.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { makeRelativePath } from "@/platform/lang/makeRelativePath.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Check, Loader2, PlusCircle } from "lucide-react";
import { NavLink, Route, Routes } from "react-router-dom";

export interface ProjectDetailWidgetProps extends WithFrontServices {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  projectId: Project["id"];
}

export function ProjectDetailWidget(props: ProjectDetailWidgetProps) {
  const project = props.services.projectService.useProject(props.projectId);
  const basePath = props.services.routingService
    .forWorkspace()
    .forClient()
    .forProject()
    .root();

  const addIterationState = promiseState.useRemoteData();

  return (
    <CommonPageContainer
      footer={
        <div className="flex flex-row gap-4 justify-end bg-linear-to-r/oklab from-indigo-50 to-teal-50 border-t border-teal-800/20 p-2 ">
          {[
            [
              props.services.routingService
                .forWorkspace(props.workspaceId)
                .forClient(props.clientId)
                .forProject(props.projectId.toString())
                .root(),
              "Iterations",
            ],
            [
              props.services.routingService
                .forWorkspace(props.workspaceId)
                .forClient(props.clientId)
                .forProject(props.projectId.toString())
                .reports(),
              "Reports",
            ],
            [
              props.services.routingService
                .forWorkspace(props.workspaceId)
                .forClient(props.clientId)
                .forProject(props.projectId.toString())
                .configuration(),
              "Configuration",
            ],
          ].map(([path, label]) => (
            <NavLink
              end
              key={path}
              to={path}
              className="transition-colors text-sky-800 aria-[current]:bg-sky-700/10 hocus:bg-sky-700/15 p-1 rounded-sm"
            >
              {label}
            </NavLink>
          ))}
        </div>
      }
      tools={
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
            element={
              <InlinePopoverForm
                trigger={
                  <Button variant="accent1" size="sm" className="flex">
                    {rd
                      .fullJourney(addIterationState.state)
                      .initially(<PlusCircle />)
                      .wait(<Loader2 />)
                      .catch(renderSmallError("w-6 h-6"))
                      .map(() => (
                        <Check />
                      ))}
                    Add iteration
                  </Button>
                }
                content={(bag) => (
                  <>
                    <PopoverHeader>Add new project</PopoverHeader>
                    <ProjectForm
                      mode="create"
                      onCancel={bag.close}
                      defaultValues={{
                        workspaceId: idSpecUtils.switchAll(
                          props.workspaceId,
                          undefined,
                        ),
                        clientId: idSpecUtils.switchAll(
                          props.clientId,
                          undefined,
                        ),
                        status: "draft",
                      }}
                      services={props.services}
                      onSubmit={async () => {}}
                      // onSubmit={(data) =>
                      // addIterationState.track(
                      //   props.services.mutationService
                      //     .createProject(data)
                      //     .then(bag.close),
                      // )
                      //}
                    />
                  </>
                )}
              />
            }
          />
        </Routes>
      }
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <ProjectListBreadcrumb {...props} />,
        <ProjectBreadcrumbView {...props} project={project} />,
      ]}
    >
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
          element={
            <ProjectIterationListWidget
              projectId={props.projectId}
              services={props.services}
            />
          }
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
          element={
            <ProjectConfigurationWidget
              services={props.services}
              projectId={props.projectId}
              workspaceId={props.workspaceId}
              clientId={props.clientId}
            />
          }
        />
      </Routes>
    </CommonPageContainer>
  );
}
