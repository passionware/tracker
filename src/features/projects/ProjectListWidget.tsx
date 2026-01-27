import { QueryFilter } from "@/api/_common/query/queryUtils.ts";
import { ProjectQuery, projectQueryUtils } from "@/api/project/project.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { PopoverHeader } from "@/components/ui/popover.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import {
  ActionMenu,
  ActionMenuCopyItem,
  ActionMenuDeleteItem,
  ActionMenuDuplicateItem,
} from "@/features/_common/ActionMenu.tsx";
import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns.tsx";
import { columnHelper } from "@/features/_common/columns/project";
import { project } from "@/features/_common/columns/project.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { ProjectListBreadcrumb } from "@/features/_common/elements/breadcrumbs/ProjectListBreadcrumb.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { ProjectQueryBar } from "@/features/_common/elements/query/ProjectQueryBar.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { ProjectForm } from "@/features/projects/_common/ProjectForm.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { Nullable } from "@/platform/typescript/Nullable";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Check, Loader2, PlusCircle } from "lucide-react";

export interface ProjectListWidgetProps extends WithFrontServices {
  filter: Nullable<QueryFilter<ProjectQuery, "status">>;
  clientId: ClientSpec;
  workspaceId: WorkspaceSpec;
}

export function ProjectListWidget(props: ProjectListWidgetProps) {
  const queryParamsService =
    props.services.queryParamsService.forEntity("projects");
  const queryParams = queryParamsService.useQueryParams();

  const query = projectQueryUtils
    .transform(queryParams)
    .build((q) => [
      q.withEnsureDefault(props),
      q.withFilter("status", props.filter),
    ]);

  const projects = props.services.projectService.useProjects(query);

  const addProjectState = promiseState.useRemoteData<void>();

  return (
    <CommonPageContainer
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <ProjectListBreadcrumb {...props} />,
      ]}
      tools={
        <>
          <ProjectQueryBar
            query={query}
            onQueryChange={(newQuery) =>
              queryParamsService.setQueryParams(newQuery)
            }
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
                  mode="create"
                  onCancel={bag.close}
                  defaultValues={{
                    workspaceIds: idSpecUtils.mapSpecificOrElse(
                      props.workspaceId,
                      (id) => [id],
                      [],
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
        onQueryChange={(newQuery) =>
          queryParamsService.setQueryParams(newQuery)
        }
        data={projects}
        getRowId={(x) => x.id}
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
          columnHelper.display({
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => (
              <ActionMenu services={props.services}>
                <ActionMenuDeleteItem
                  onClick={() => {
                    void props.services.mutationService.deleteProject(
                      row.original.id,
                    );
                  }}
                >
                  Delete Project
                </ActionMenuDeleteItem>
                <InlinePopoverForm
                  trigger={
                    <ActionMenuDuplicateItem
                      onSelect={(e) => e.preventDefault()}
                    >
                      Duplicate Report
                    </ActionMenuDuplicateItem>
                  }
                  content={(bag) => (
                    <ProjectForm
                      mode="create"
                      defaultValues={row.original}
                      services={props.services}
                      onSubmit={async (data) => {
                        // todo this should be our UserFlowService
                        const { id } =
                          await props.services.mutationService.createProject(
                            data,
                          );
                        bag.close();
                        props.services.navigationService.navigate(
                          props.services.routingService
                            .forWorkspace(
                              data.workspaceIds.length > 1
                                ? null
                                : data.workspaceIds[0],
                            )
                            .forClient(data.clientId)
                            .forProject(id.toString())
                            .root(),
                        );
                      }}
                      onCancel={bag.close}
                    />
                  )}
                />
                <ActionMenuCopyItem copyText={row.original.id.toString()}>
                  Copy project ID
                </ActionMenuCopyItem>
              </ActionMenu>
            ),
          }),
        ]}
      />
    </CommonPageContainer>
  );
}
