import {
  Contractor,
  contractorQueryUtils,
} from "@/api/contractor/contractor.api.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import {
  ActionMenu,
  ActionMenuDeleteItem,
} from "@/features/_common/ActionMenu.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { createColumnHelper } from "@tanstack/react-table";
import { useState } from "react";

export interface ProjectContractorsProps extends WithFrontServices {
  projectId: number;
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
}

const c = createColumnHelper<Contractor>();

export function ProjectContractors(props: ProjectContractorsProps) {
  const [_query, setQuery] = useState(contractorQueryUtils.ofEmpty());
  const query = contractorQueryUtils.transform(_query).build((q) => [
    q.withFilter("projectId", {
      operator: "oneOf",
      value: [props.projectId],
    }),
  ]);
  const contractors = props.services.contractorService.useContractors(query);

  return (
    <>
      <ListView
        data={contractors}
        query={query}
        onQueryChange={setQuery}
        columns={[
          c.accessor("name", {
            header: "Name",
          }),
          c.accessor("fullName", {
            header: "Full Name",
          }),
          c.display({
            id: "actions",
            cell: (info) => (
              <ActionMenu services={props.services}>
                <ActionMenuDeleteItem
                  onClick={() => {
                    return props.services.mutationService.unassignContractorFromProject(
                      props.projectId,
                      info.row.original.id,
                    );
                  }}
                >
                  Unassign Contractor
                </ActionMenuDeleteItem>
              </ActionMenu>
            ),
          }),
        ]}
      />
    </>
  );
}
