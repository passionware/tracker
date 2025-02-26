import {
  ProjectIteration,
  projectIterationQueryUtils,
} from "@/api/project-iteration/project-iteration.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { maybe } from "@passionware/monads";
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

  return (
    <>
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
