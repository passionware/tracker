import { EnumFilter } from "@/api/_common/query/filters/EnumFilter.ts";
import { paginationUtils } from "@/api/_common/query/pagination.ts";
import {
  WithFilters,
  withFiltersUtils,
  WithPagination,
  WithSorter,
  withSorterUtils,
} from "@/api/_common/query/queryUtils.ts";
import { Client } from "@/api/clients/clients.api.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";

export interface VariablePayload {
  name: string;
  type: "const" | "expression";
  value: string;
  workspaceId: Nullable<Workspace["id"]>;
  clientId: Nullable<Client["id"]>;
  contractorId: Nullable<Contractor["id"]>;
}

export interface Variable extends VariablePayload {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

export type VariableQuery = WithFilters<{
  type: Nullable<EnumFilter<VariablePayload["type"]>>;
  workspaceId: Nullable<EnumFilter<Workspace["id"]>>;
  clientId: Nullable<EnumFilter<Client["id"]>>;
  contractorId: Nullable<EnumFilter<Contractor["id"]>>;
}> &
  WithSorter<
    Exclude<keyof Variable, "id" | "workspaceId" | "clientId" | "contractorId">
  > &
  WithPagination;

export interface VariableApi {
  getVariables(query: VariableQuery): Promise<Variable[]>;
  createVariable(variable: VariablePayload): Promise<Pick<Variable, "id">>;
  updateVariable(
    id: Variable["id"],
    payload: Partial<VariablePayload>,
  ): Promise<void>;
  deleteVariable(id: Variable["id"]): Promise<void>;
}

export const variableQueryUtils = {
  ...withFiltersUtils<VariableQuery>(),
  ...withSorterUtils<VariableQuery>(),
  ofDefault: (
    workspaceId: Workspace["id"],
    clientId: Client["id"],
  ): VariableQuery => ({
    filters: {
      workspaceId: { operator: "oneOf", value: [workspaceId] },
      clientId: { operator: "oneOf", value: [clientId] },
      contractorId: null,
      type: null,
    },
    sort: { field: "updatedAt", order: "asc" },
    page: paginationUtils.ofDefault(),
  }),
};
