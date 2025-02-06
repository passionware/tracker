import { Project } from "@/api/project/project.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { getColumnHelper } from "@/features/_common/columns/_common/columnHelper.ts";
import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns.tsx";
import {
  ClientSpec,
  WithRoutingService,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { Link } from "react-router-dom";

const helper = getColumnHelper<Project>();

export const project = {
  name: (
    services: WithRoutingService,
    spec: {
      workspaceId: WorkspaceSpec;
      clientId: ClientSpec;
    },
  ) =>
    helper.accessor("name", {
      header: "Name",
      cell: (info) => {
        const value = info.getValue();
        const id = info.row.original.id;
        return (
          <Link
              className="text-sky-800 hover:underline"
            to={services.routingService
              .forWorkspace(spec.workspaceId)
              .forClient(spec.clientId)
              .forProject(id.toString())
              .root()}
          >
            {value}
          </Link>
        );
      },
    }),
  status: helper.accessor("status", {
    header: "Status",
    cell: (info) => {
      const value = info.getValue();
      return (
        <Badge
          variant={
            (
              {
                active: "positive",
                closed: "secondary",
                draft: "accent1",
              } as const
            )[value]
          }
        >
          {value}
        </Badge>
      );
    },
  }),
  createdAt: sharedColumns.createdAt,
  updatedAt: sharedColumns.updatedAt,
};
