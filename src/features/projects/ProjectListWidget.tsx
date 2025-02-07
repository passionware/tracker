import { Project, projectQueryUtils } from "@/api/project/project.api.ts";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { PopoverHeader } from "@/components/ui/popover.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/ClientBreadcrumbLink.tsx";
import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns.tsx";
import { project } from "@/features/_common/columns/project.tsx";
import { columnHelper } from "@/features/_common/columns/project";
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
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithProjectService } from "@/services/io/ProjectService/ProjectService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import {
  Check,
  Copy,
  Loader2,
  MoreHorizontal,
  PlusCircle,
  Trash2,
} from "lucide-react";
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
      WithPreferenceService,
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
          columnHelper.display({
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => (
              <ActionMenu services={props.services} entry={row.original} />
            ),
          }),
        ]}
      />
    </CommonPageContainer>
  );
}
function ActionMenu(
  props: WithServices<
    [
      WithPreferenceService,
      WithMutationService,
      WithClientService,
      WithContractorService,
      WithWorkspaceService,
      WithNavigationService,
      WithRoutingService,
    ]
  > & {
    entry: Project;
  },
) {
  const isDangerMode = props.services.preferenceService.useIsDangerMode();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/*  TODO open menu should be centralized in patterns? */}
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        {isDangerMode && (
          <DropdownMenuItem
            onClick={() => {
              void props.services.mutationService.deleteProject(props.entry.id);
            }}
          >
            <Trash2 />
            Delete Project
          </DropdownMenuItem>
        )}
        <InlinePopoverForm
          trigger={
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
              }}
            >
              <Copy />
              Duplicate Report
            </DropdownMenuItem>
          }
          content={(bag) => (
            <ProjectForm
              defaultValues={props.entry}
              services={props.services}
              onSubmit={async (data) => {
                // todo this should be our UserFlowService
                const { id } =
                  await props.services.mutationService.createProject(data);
                bag.close();
                props.services.navigationService.navigate(
                  props.services.routingService
                    .forWorkspace(data.workspaceId)
                    .forClient(data.clientId)
                    .forProject(id.toString())
                    .configuration(),
                );
              }}
              onCancel={bag.close}
            />
          )}
        />
        <DropdownMenuItem
          onClick={() =>
            navigator.clipboard.writeText(props.entry.id.toString())
          }
        >
          Copy project ID
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
