import { Client } from "@/api/clients/clients.api.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { getColumnHelper } from "@/features/_common/columns/_common/columnHelper.ts";
import {
  ClientView,
  ClientWidget,
} from "@/features/_common/elements/pickers/ClientView.tsx";
import { ContractorView } from "@/features/_common/elements/pickers/ContractorView.tsx";
import {
  WorkspaceView,
  WorkspaceWidget,
} from "@/features/_common/elements/pickers/WorkspaceView.tsx";
import { renderSpinnerMutation } from "@/features/_common/patterns/renderSpinnerMutation.tsx";
import { TruncatedMultilineText } from "@/features/_common/TruncatedMultilineText.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { ExpressionContext } from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, Maybe, rd, truthy } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
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
      cell: (info) =>
        services.formatService.temporal.single.compact(info.getValue()),
    }),
  description: getColumnHelper<{ description: string }>().accessor(
    "description",
    {
      header: "Description",
      cell: (info) => (
        <TruncatedMultilineText>{info.getValue()}</TruncatedMultilineText>
      ),
      meta: {
        sortKey: "description",
      },
    },
  ),
  select: <T,>(
    renderer: (
      cellContext: CellContext<T, unknown>,
      button: ReactElement,
      // this will be connected to local promiseState
      track: (promise: Promise<void>) => Promise<void>,
    ) => ReactNode,
  ) =>
    getColumnHelper<T>().display({
      id: "select",
      cell: (info) => {
        const promise = promiseState.useRemoteData<void>();
        return renderer(
          info,
          <Button>
            {renderSpinnerMutation(rd.toMutation(promise.state))}
            Select
          </Button>,
          promise.track,
        );
      },
    }),
  workspace: getColumnHelper<{ workspace: Nullable<Workspace> }>().accessor(
    "workspace",
    {
      header: "W",
      cell: (info) => (
        <WorkspaceView
          layout="avatar"
          workspace={maybe.mapOrElse(info.getValue(), rd.of, rd.ofIdle())}
        />
      ),
      meta: {
        sortKey: "workspace",
        tooltip: "Workspace",
        tooltipCompact: true,
      },
    },
  ),
  client: getColumnHelper<{ client: Nullable<Client> }>().accessor("client", {
    header: "C",
    cell: (info) => (
      <ClientView
        layout="avatar"
        size="sm"
        client={maybe.mapOrElse(info.getValue(), rd.of, rd.ofIdle())}
      />
    ),
    meta: {
      sortKey: "client",
      tooltip: "Client",
      tooltipCompact: true,
    },
  }),
  contractor: getColumnHelper<{
    contractor: Nullable<Contractor>;
  }>().accessor("contractor", {
    header: "Contractor",
    cell: (info) => (
      <ContractorView
        contractor={maybe.mapOrElse(info.getValue(), rd.of, rd.ofIdle())}
        layout="full"
        size="sm"
        className="max-w-64"
      />
    ),
    meta: {
      sortKey: "contractor",
    },
  }),
  getContextual: (context: Partial<ExpressionContext>) =>
    [
      maybe.isPresent(context.workspaceId) &&
        idSpecUtils.isAll(context.workspaceId) &&
        foreignColumns.workspace,
      maybe.isPresent(context.clientId) &&
        idSpecUtils.isAll(context.clientId) &&
        foreignColumns.client,
      maybe.isPresent(context.contractorId) &&
        idSpecUtils.isAll(context.contractorId) &&
        foreignColumns.contractor,
    ].filter(truthy.isTruthy),
};
