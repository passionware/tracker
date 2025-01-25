import { EnumFilter } from "@/api/_common/query/filters/EnumFilter.ts";
import { unassignedUtils } from "@/api/_common/query/filters/Unassigned.ts";
import {
  WithFilters,
  withFiltersUtils,
  WithPagination,
} from "@/api/_common/query/queryUtils.ts";
import { Client } from "@/api/clients/clients.api.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { ClientPicker } from "@/features/_common/elements/pickers/ClientPicker.tsx";
import { ContractorMultiPicker } from "@/features/_common/elements/pickers/ContractorPicker.tsx";
import { WorkspacePicker } from "@/features/_common/elements/pickers/WorkspacePicker.tsx";
import {
  QueryBarSpec,
  queryBarSpecUtils,
} from "@/features/_common/elements/query/_common/QueryBarSpec.tsx";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe } from "@passionware/monads";

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
}

export function CommonQueryBar<Q extends QueryBase>(
  props: CommonQueryBarProps<Q>,
) {
  function handleChange<T extends keyof QueryBase["filters"], X>(
    key: T,
  ): (value: Nullable<X>) => void {
    return (value) =>
      props.onQueryChange(
        withFiltersUtils<Q>().setFilter(
          props.query,
          key,
          maybe.map(
            value,
            (value) =>
              ({
                operator: "oneOf" as const,
                value,
              }) as QueryBase["filters"][T],
          ),
        ),
      );
  }

  return (
    <>
      {queryBarSpecUtils.renderIf(
        props.spec.workspace,
        <WorkspacePicker
          size="sm"
          allowClear
          allowUnassigned
          disabled={queryBarSpecUtils.isDisabled(props.spec.workspace)}
          layout={
            queryBarSpecUtils.isDisabled(props.spec.workspace)
              ? "avatar"
              : "full"
          }
          value={props.query.filters.workspaceId?.value[0]}
          onSelect={handleChange("workspaceId")}
          services={props.services}
        />,
      )}
      {queryBarSpecUtils.renderIf(
        props.spec.client,
        <ClientPicker
          size="sm"
          allowClear
          allowUnassigned
          disabled={queryBarSpecUtils.isDisabled(props.spec.client)}
          layout={
            queryBarSpecUtils.isDisabled(props.spec.client) ? "avatar" : "full"
          }
          services={props.services}
          value={props.query.filters.clientId?.value[0]}
          onSelect={handleChange("clientId")}
        />,
      )}
      {queryBarSpecUtils.renderIf(
        props.spec.contractor,
        <ContractorMultiPicker
          size="sm"
          allowUnassigned
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
