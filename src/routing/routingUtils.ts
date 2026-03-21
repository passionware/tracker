import { Client } from "@/api/clients/clients.api.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { IdSpec, idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { maybe, Maybe } from "@passionware/monads";

export type WorkspacePathSegment = string | ":workspaceId";
export type WorkspaceSpec = IdSpec<Workspace["id"]>;
type WorkspaceParam = Maybe<WorkspaceSpec>;

export type ClientPathSegment = string | ":clientId";
export type ClientSpec = IdSpec<Client["id"]>;
type ClientParam = Maybe<ClientSpec>;

export type ContractorSpec = IdSpec<Contractor["id"]>;
export type ContractorPathSegment = string | ":contractorId";
type ContractorParam = Maybe<ContractorSpec>;

export type CubePathSegment = string | ":cubePath*";
export type CubePath = string[]; // Array of path segments like ["project:abc", "task:xyz"]
type CubePathParam = Maybe<CubePath>;

export const routingUtils = {
  workspace: {
    fromString: (value: WorkspacePathSegment): WorkspaceSpec => {
      if (value === "all") {
        return idSpecUtils.ofAll();
      }
      return parseInt(value, 10);
    },
    toString: (value: WorkspaceParam): WorkspacePathSegment => {
      if (maybe.isAbsent(value)) {
        return ":workspaceId";
      }
      if (idSpecUtils.isAll(value)) {
        return "all";
      }
      return value.toString();
    },
  },
  client: {
    fromString: (value: ClientPathSegment): ClientSpec => {
      if (value === "all") {
        return idSpecUtils.ofAll();
      }
      return parseInt(value, 10);
    },
    toString: (value: ClientParam): ClientPathSegment => {
      if (maybe.isAbsent(value)) {
        return ":clientId";
      }
      if (idSpecUtils.isAll(value)) {
        return "all";
      }
      return value.toString();
    },
  },
  contractor: {
    fromString: (value: ContractorPathSegment): ContractorSpec => {
      if (value === "all") {
        return idSpecUtils.ofAll();
      }
      return parseInt(value, 10);
    },
    toString: (value: ContractorParam): ContractorPathSegment => {
      if (maybe.isAbsent(value)) {
        return ":contractorId";
      }
      if (idSpecUtils.isAll(value)) {
        return "all";
      }
      return value.toString();
    },
  },
  cubePath: {
    fromString: (value: string): CubePath => {
      // Parse URL path segments like "project:abc/task:xyz" into ["project:abc", "task:xyz"]
      if (!value || value === ":cubePath*") {
        return [];
      }
      return value.split("/").filter(Boolean);
    },
    toString: (value: CubePathParam): CubePathSegment => {
      if (maybe.isAbsent(value) || value.length === 0) {
        return "";
      }
      // Join path segments with "/"
      return value.join("/");
    },
  },
};
