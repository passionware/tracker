import { Project } from "@/api/project/project.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { getColumnHelper } from "@/features/_common/columns/_common/columnHelper.ts";
import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns.tsx";

const helper = getColumnHelper<Project>();

export const project = {
  name: helper.accessor("name", { header: "Name" }),
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
