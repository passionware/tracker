import { projectQueryUtils } from "@/api/project/project.api.ts";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import { PopoverHeader } from "@/components/ui/popover.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/ClientBreadcrumbLink.tsx";
import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns.tsx";
import { project } from "@/features/_common/columns/project.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ProjectQueryBar } from "@/features/_common/elements/query/ProjectQueryBar.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/WorkspaceBreadcrumbLink.tsx";
import { ProjectForm } from "@/features/projects/_common/ProjectForm.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ClientSpec,
  WithRoutingService,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithNavigationService } from "@/services/internal/NavigationService/NavigationService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithProjectService } from "@/services/io/ProjectService/ProjectService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Check, Loader2, PlusCircle } from "lucide-react";
import { useState } from "react";

export interface ProjectListWidgetProps
  extends WithServices<
    [
      WithWorkspaceService,
      WithClientService,
      WithProjectService,
      WithFormatService,
      WithContractorService,
      WithRoutingService,
      WithNavigationService,
      WithMutationService,
    ]
  > {
  filter: unknown; // something like all/current/past - should be part of ProjectQuery?
  clientId: ClientSpec;
  workspaceId: WorkspaceSpec;
}

export function ProjectListWidget(props: ProjectListWidgetProps) {
  const [_query, setQuery] = useState(projectQueryUtils.ofDefault());
  const query = projectQueryUtils.ensureDefault(_query, props);
  const projects = props.services.projectService.useProjects(query);

  const addProjectState = promiseState.useRemoteData<void>();

  return (
    <CommonPageContainer
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <BreadcrumbPage>Projects</BreadcrumbPage>,
      ]}
      tools={
        <>
          <ProjectQueryBar
            query={query}
            onQueryChange={setQuery}
            services={props.services}
            spec={{
              workspace: idSpecUtils.takeOrElse(
                props.workspaceId,
                "disable",
                "show",
              ),
              client: idSpecUtils.takeOrElse(props.clientId, "disable", "show"),
              contractor: "hide",
            }}
          />
          <InlinePopoverForm
            trigger={
              <Button variant="accent1" size="sm" className="flex">
                {rd
                  .fullJourney(addProjectState.state)
                  .initially(<PlusCircle />)
                  .wait(<Loader2 />)
                  .catch(renderSmallError("w-6 h-6"))
                  .map(() => (
                    <Check />
                  ))}
                Add project
              </Button>
            }
            content={(bag) => (
              <>
                <PopoverHeader>Add new project</PopoverHeader>
                <ProjectForm
                  onCancel={bag.close}
                  defaultValues={{
                    workspaceId: idSpecUtils.switchAll(
                      props.workspaceId,
                      undefined,
                    ),
                    clientId: idSpecUtils.switchAll(props.clientId, undefined),
                    status: "draft",
                  }}
                  services={props.services}
                  onSubmit={(data) =>
                    addProjectState.track(
                      props.services.mutationService
                        .createProject(data)
                        .then(bag.close),
                    )
                  }
                />
              </>
            )}
          />
        </>
      }
    >
      <ListView
        query={query}
        onQueryChange={setQuery}
        data={projects}
        onRowDoubleClick={(project) => {
          props.services.navigationService.navigate(
            props.services.routingService
              .forWorkspace(props.workspaceId)
              .forClient(props.clientId)
              .forProject(project.id.toString())
              .root(),
          );
        }}
        columns={[
          ...sharedColumns.getContextualForIds(
            {
              workspaceId: props.workspaceId,
              clientId: props.clientId,
            },
            props.services,
          ),
          project.name(props.services, props),
          project.createdAt(props.services),
          project.status,
        ]}
      />
    </CommonPageContainer>
  );
}
