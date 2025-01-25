import { EnumFilter } from "@/api/_common/query/filters/EnumFilter.ts";
import {
  Unassigned,
  unassignedUtils,
} from "@/api/_common/query/filters/Unassigned.ts";
import {
  WithFilters,
  withFiltersUtils,
  WithPagination,
} from "@/api/_common/query/queryUtils.ts";
import { Client } from "@/api/clients/clients.api.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { ClientMultiPicker } from "@/features/_common/elements/pickers/ClientPicker.tsx";
import { ContractorMultiPicker } from "@/features/_common/elements/pickers/ContractorPicker.tsx";
import { WorkspaceMultiPicker } from "@/features/_common/elements/pickers/WorkspacePicker.tsx";
import {
  QueryBarSpec,
  queryBarSpecUtils,
} from "@/features/_common/elements/query/_common/QueryBarSpec.tsx";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, Present } from "@passionware/monads";

type QueryBase = WithFilters<{
  workspaceId: Nullable<EnumFilter<Nullable<Workspace["id"]>>>;
  clientId: Nullable<EnumFilter<Nullable<Client["id"]>>>;
  contractorId: Nullable<EnumFilter<Nullable<Contractor["id"]>>>;
}> &
  WithPagination;

export interface CommonQueryBarProps<Q extends QueryBase>
  extends WithServices<
    [WithWorkspaceService, WithClientService, WithContractorService]
  > {
  spec: QueryBarSpec;
  query: Q;
  onQueryChange: (query: Q) => void;
  allowUnassigned: {
    workspace?: boolean;
    client?: boolean;
    contractor?: boolean;
  };
}

export function CommonQueryBar<Q extends QueryBase>(
  props: CommonQueryBarProps<Q>,
) {
  const {
    workspace: allowWorkspace,
    client: allowClient,
    contractor: allowContractor,
  } = props.allowUnassigned;

  type FilterValue<F extends keyof QueryBase["filters"]> = Present<
    Q["filters"][F]
  >["value"][number];

  function handleChange<T extends keyof QueryBase["filters"]>(
    key: T,
  ): (value: (FilterValue<T> | Unassigned)[]) => void {
    return (value) =>
      props.onQueryChange(
        withFiltersUtils<Q>().setFilter(
          props.query,
          key,
          maybe.mapOrNull(value, (value) => ({
            operator: "oneOf" as const,
            value: value.map(unassignedUtils.getOrNull),
          })),
        ),
      );
  }

  return (
    <>
      {queryBarSpecUtils.renderIf(
        props.spec.workspace,
        <WorkspaceMultiPicker
          size="sm"
          allowUnassigned={allowWorkspace}
          disabled={queryBarSpecUtils.isDisabled(props.spec.workspace)}
          layout={
            queryBarSpecUtils.isDisabled(props.spec.workspace)
              ? "avatar"
              : "full"
          }
          value={
            props.query.filters.workspaceId?.value.map(
              unassignedUtils.fromMaybe,
            ) ?? []
          }
          onSelect={handleChange("workspaceId")}
          services={props.services}
        />,
      )}
      {queryBarSpecUtils.renderIf(
        props.spec.client,
        <ClientMultiPicker
          size="sm"
          allowUnassigned={allowClient}
          disabled={queryBarSpecUtils.isDisabled(props.spec.client)}
          layout={
            queryBarSpecUtils.isDisabled(props.spec.client) ? "avatar" : "full"
          }
          services={props.services}
          value={
            props.query.filters.clientId?.value.map(
              unassignedUtils.fromMaybe,
            ) ?? []
          }
          onSelect={handleChange("clientId")}
        />,
      )}
      {queryBarSpecUtils.renderIf(
        props.spec.contractor,
        <ContractorMultiPicker
          size="sm"
          allowUnassigned={allowContractor}
          services={props.services}
          disabled={queryBarSpecUtils.isDisabled(props.spec.contractor)}
          layout={
            queryBarSpecUtils.isDisabled(props.spec.contractor)
              ? "avatar"
              : "full"
          }
          value={
            props.query.filters.contractorId?.value.map(
              unassignedUtils.fromMaybe,
            ) ?? []
          }
          onSelect={handleChange("contractorId")}
        />,
      )}
    </>
  );
}
