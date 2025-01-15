import { Client } from "@/api/clients/clients.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { IdSpec, idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { maybe, Maybe } from "@passionware/monads";

export type WorkspacePathSegment = string | ":workspaceId";
export type WorkspaceSpec = IdSpec<Workspace["id"]>;
type WorkspaceParam = Maybe<WorkspaceSpec>;
export type ClientPathSegment = string | ":clientId";
export type ClientSpec = IdSpec<Client["id"]>;
type ClientParam = Maybe<ClientSpec>;

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
};

export interface RoutingService {
  forWorkspace: (workspaceId?: WorkspaceParam) => {
    root: () => string;
    forClient: (clientId?: ClientParam) => {
      reports: () => string;
      charges: () => string;
      costs: () => string;
      potentialCosts: () => string;
      root: () => string;
    };
  };

  forGlobal: () => {
    root: () => string;
  };
}
export interface WithRoutingService {
  routingService: RoutingService;
}
