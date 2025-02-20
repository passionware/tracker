import {
  ProjectIteration,
  projectIterationQueryUtils,
} from "@/api/project-iteration/project-iteration.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { PopoverHeader } from "@/components/ui/popover.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import {
  ActionMenu,
  ActionMenuDeleteItem,
  ActionMenuEditItem,
} from "@/features/_common/ActionMenu.tsx";
import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns.tsx";
import { ClientWidget } from "@/features/_common/elements/pickers/ClientView.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { ProjectForm } from "@/features/projects/_common/ProjectForm.tsx";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { maybe, rd } from "@passionware/monads";
import { createColumnHelper } from "@tanstack/react-table";
import { capitalize } from "lodash";
import { useState } from "react";

export interface ProjectDetailContentProps extends WithFrontServices {
  projectId: number;
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
}

const c = createColumnHelper<ProjectIteration>();

export function ProjectDetailContent(props: ProjectDetailContentProps) {
  const [_query, setQuery] = useState(projectIterationQueryUtils.ofDefault());
  const statusFilter =
    props.services.locationService.useCurrentProjectIterationStatus();
  const query = projectIterationQueryUtils.transform(_query).build((q) => [
    q.withFilter("projectId", {
      operator: "oneOf",
      value: [props.projectId],
    }),
    q.withFilter(
      "status",
      maybe.map(statusFilter, (x) =>
        x === "all" // todo probably we need navigation utils same as for ClientSpec and WorkspaceSpec
          ? null
          : {
              operator: "oneOf",
              value: x === "active" ? ["active", "draft"] : [x],
            },
      ),
    ),
  ]);
  const projectIterations =
    props.services.projectIterationService.useProjectIterations(query);

  const project = props.services.projectService.useProject(props.projectId);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-row gap-2 items-center">
            <div className="text-slate-700 font-light">Project:</div>
            <div>
              {rd
                .journey(project)
                .wait(<Skeleton className="h-[1lh] w-30" />)
                .catch(renderError)
                .map((x) => x.name)}
            </div>
            <div>
              {rd
                .journey(project)
                .wait(<Skeleton className="h-[1lh] w-30" />)
                .catch(renderError)
                .map((x) => (
                  <ClientWidget
                    size="sm"
                    layout="avatar"
                    clientId={x.clientId}
                    services={props.services}
                  />
                ))}
            </div>
            <ActionMenu services={props.services} className="ml-auto">
              {rd
                .journey(project)
                .wait(<Skeleton className="h-[1lh] w-30" />)
                .catch(renderError)
                .map((project) => (
                  <>
                    <ActionMenuDeleteItem
                      onClick={async () => {
                        await props.services.mutationService.deleteProject(
                          project.id,
                        );
                        // navigate to the list
                        props.services.navigationService.navigate(
                          props.services.routingService
                            .forWorkspace(props.workspaceId)
                            .forClient(props.clientId)
                            .projectsRoot(),
                        );
                      }}
                    >
                      Delete project
                    </ActionMenuDeleteItem>
                    <InlinePopoverForm
                      trigger={
                        <ActionMenuEditItem
                          onSelect={(e) => e.preventDefault()}
                        >
                          Edit project
                        </ActionMenuEditItem>
                      }
                      content={(bag) => (
                        <>
                          <PopoverHeader>Edit project</PopoverHeader>
                          <ProjectForm
                            services={props.services}
                            onCancel={bag.close}
                            mode="edit"
                            defaultValues={project}
                            onSubmit={async (data) => {
                              await props.services.mutationService.editProject(
                                project.id,
                                data,
                              );
                              bag.close();
                            }}
                          />
                        </>
                      )}
                    />
                  </>
                ))}
            </ActionMenu>
          </CardTitle>
          <CardDescription>
            {rd
              .journey(project)
              .wait(<Skeleton className="h-[1lh] w-30" />)
              .catch(renderError)
              .map((x) => x.description)}
          </CardDescription>
        </CardHeader>
      </Card>
      <ListView
        data={projectIterations}
        query={query}
        onQueryChange={setQuery}
        onRowDoubleClick={(row) => {
          props.services.navigationService.navigate(
            props.services.routingService
              .forWorkspace(props.workspaceId)
              .forClient(props.clientId)
              .forProject(props.projectId.toString())
              .forIteration(row.id.toString())
              .root(),
          );
        }}
        columns={[
          c.accessor("ordinalNumber", {
            header: "#",
            meta: {
              sortKey: "ordinalNumber",
            },
          }),
          c.display({
            header: "Range",
            cell: (cell) =>
              props.services.formatService.temporal.range.compact(
                cell.row.original.periodStart,
                cell.row.original.periodEnd,
              ),
            meta: {
              sortKey: "periodStart",
            },
          }),
          c.accessor("status", {
            header: "Status",
            cell: (info) => {
              const value = info.row.original.status;
              return (
                <Badge
                  variant={
                    (
                      {
                        draft: "secondary",
                        active: "positive",
                        closed: "destructive",
                      } as const
                    )[value]
                  }
                >
                  {capitalize(value)}
                </Badge>
              );
            },
            meta: {
              sortKey: "status",
            },
          }),
          sharedColumns.description,
        ]}
      />
    </>
  );
}
