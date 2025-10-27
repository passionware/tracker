import { Client } from "@/api/clients/clients.api.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";
import { Cost } from "@/api/cost/cost.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { getColumnHelper } from "@/features/_common/columns/_common/columnHelper.ts";
import {
  ClientView,
  ClientWidget,
} from "@/features/_common/elements/pickers/ClientView.tsx";
import {
  ContractorView,
  ContractorWidget,
} from "@/features/_common/elements/pickers/ContractorView.tsx";
import {
  WorkspaceView,
  WorkspaceWidget,
} from "@/features/_common/elements/pickers/WorkspaceView.tsx";
import { renderSpinnerMutation } from "@/features/_common/patterns/renderSpinnerMutation.tsx";
import { TruncatedMultilineText } from "@/features/_common/TruncatedMultilineText.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { SelectionState, selectionState } from "@/platform/lang/SelectionState";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import { MergeServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { ExpressionContext } from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, Maybe, rd, RemoteData, truthy } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { CellContext } from "@tanstack/react-table";
import { ReactElement, ReactNode } from "react";

export const sharedColumns = {
  selection: <T extends { id: string | number }>(
    state: SelectionState<T["id"]>,
    data: RemoteData<T[]>,
    onSelectionChange: (state: SelectionState<T["id"]>) => void,
  ) => {
    const isEverythingSelected = selectionState.isSelectAll(state);
    const isMixedSelected = selectionState.isPartiallySelected(
      state,
      rd.tryGet(data)?.length ?? 0,
    );

    function handleToggleAll() {
      onSelectionChange(selectionState.toggleSelectAll(state));
    }

    return getColumnHelper<T>().display({
      id: "selection",
      meta: {
        cellClassName:
          "py-0 px-4 text-center cursor-pointer hocus:backdrop-brightness-96",
        headerClassName:
          "py-0 px-4 text-center cursor-pointer hocus:backdrop-brightness-96",
        cellProps: ({ row }: CellContext<T, unknown>) => ({
          onClick: (e: React.MouseEvent<HTMLTableCellElement>) => {
            e.preventDefault();
            e.stopPropagation();
            onSelectionChange(selectionState.toggle(state, row.original.id));
          },
        }),
        headerProps: () => ({
          onClick: (e: React.MouseEvent<HTMLTableCellElement>) => {
            e.preventDefault();
            e.stopPropagation();
            handleToggleAll();
          },
        }),
      },

      header: () => (
        <Checkbox
          checked={isMixedSelected ? "indeterminate" : isEverythingSelected}
          className="align-middle"
          disabled={rd.mapOrElse(data, (data) => data.length === 0, true)}
          onCheckedChange={handleToggleAll}
        />
      ),
      cell: (info) => (
        <Checkbox
          className="align-middle"
          checked={selectionState.isSelected(state, info.row.original.id)}
          onCheckedChange={() =>
            onSelectionChange(
              selectionState.toggle(state, info.row.original.id),
            )
          }
        />
      ),
    });
  },
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
  contractorId: (services: WithContractorService) =>
    getColumnHelper<{
      contractorId: Maybe<Contractor["id"]>;
    }>().accessor("contractorId", {
      header: "Contractor",
      cell: (info) => (
        <ContractorWidget
          layout="avatar"
          contractorId={info.getValue()}
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
        <TruncatedMultilineText>
          {maybe.fromTruthy(info.getValue()) ?? (
            <div className="p-1.5 inline-block bg-slate-100 text-slate-500 rounded">
              N/A
            </div>
          )}
        </TruncatedMultilineText>
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
        sharedColumns.workspace,
      maybe.isPresent(context.clientId) &&
        idSpecUtils.isAll(context.clientId) &&
        sharedColumns.client,
      maybe.isPresent(context.contractorId) &&
        idSpecUtils.isAll(context.contractorId) &&
        sharedColumns.contractor,
    ].filter(truthy.isTruthy),
  getContextualForIds: (
    context: Partial<ExpressionContext>,
    services: MergeServices<
      [WithWorkspaceService, WithClientService, WithContractorService]
    >,
  ) =>
    [
      maybe.isPresent(context.workspaceId) &&
        idSpecUtils.isAll(context.workspaceId) &&
        sharedColumns.workspaceId(services),
      maybe.isPresent(context.clientId) &&
        idSpecUtils.isAll(context.clientId) &&
        sharedColumns.clientId(services),
      maybe.isPresent(context.contractorId) &&
        idSpecUtils.isAll(context.contractorId) &&
        sharedColumns.contractorId(services),
    ].filter(truthy.isTruthy),
  createdAt: (services: WithFormatService) =>
    getColumnHelper<Pick<Cost, "createdAt">>().accessor("createdAt", {
      header: "Created At",
      cell: (info) =>
        services.formatService.temporal.single.compactWithTime(info.getValue()),
      meta: {
        sortKey: "createdAt",
      },
    }),
};
