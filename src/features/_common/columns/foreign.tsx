import { Client } from "@/api/clients/clients.api.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { getColumnHelper } from "@/features/_common/columns/_common/columnHelper.ts";
import { ClientWidget } from "@/features/_common/elements/pickers/ClientView.tsx";
import { WorkspaceWidget } from "@/features/_common/elements/pickers/WorkspaceView.tsx";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { Maybe } from "@passionware/monads";
import { CellContext } from "@tanstack/react-table";
import { ReactElement, ReactNode } from "react";

export const foreignColumns = {
  workspaceId: (services: WithWorkspaceService) =>
    getColumnHelper<{
      workspaceId: Maybe<Workspace["id"]>;
    }>().accessor("workspaceId", {
      header: "Workspace",
      cell: (info) => (
        <WorkspaceWidget
          layout="avatar"
          workspaceId={info.getValue()}
          services={services}
        />
      ),
    }),
  clientId: (services: WithClientService) =>
    getColumnHelper<{
      clientId: Maybe<Client["id"]>;
    }>().accessor("clientId", {
      header: "Client",
      cell: (info) => (
        <ClientWidget
          layout="avatar"
          clientId={info.getValue()}
          services={services}
        />
      ),
    }),
  contractorId: (services: WithClientService) =>
    getColumnHelper<{
      contractorId: Maybe<Contractor["id"]>;
    }>().accessor("contractorId", {
      header: "Contractor",
      cell: (info) => (
        <ClientWidget
          layout="avatar"
          clientId={info.getValue()}
          services={services}
        />
      ),
    }),
  updatedAt: (services: WithFormatService) =>
    getColumnHelper<{ updatedAt: Date }>().accessor("updatedAt", {
      header: "Last updated",
      cell: (info) => services.formatService.temporal.datetime(info.getValue()),
    }),
  select: <T,>(
    renderer: (
      cellContext: CellContext<T, unknown>,
      button: ReactElement,
    ) => ReactNode,
  ) =>
    getColumnHelper<T>().display({
      id: "select",
      cell: (info) => renderer(info, <Button>Select</Button>),
    }),
};
