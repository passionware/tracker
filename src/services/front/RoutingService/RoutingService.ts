import { Client } from "@/api/clients/clients.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { maybe, Maybe } from "@passionware/monads";

const all = Symbol("all");
export type All = typeof all;
export type WorkspacePathSegment = string | ":workspaceId";
export type WorkspaceSpec = Workspace["id"] | All;
type WorkspaceParam = Maybe<WorkspaceSpec>;
export type ClientPathSegment = string | ":clientId";
export type ClientSpec = Client["id"] | All;
type ClientParam = Maybe<ClientSpec>;

export const routingUtils = {
  workspace: {
    isAll: (value: unknown): value is All => value === all,
    ofAll: (): All => all,
    switchAll: <T>(value: WorkspaceSpec, switchTo: T) =>
      value === all ? switchTo : value,
    fromString: (value: WorkspacePathSegment): WorkspaceSpec => {
      if (value === "all") {
        return all;
      }
      return parseInt(value, 10);
    },
    toString: (value: WorkspaceParam): WorkspacePathSegment => {
      if (maybe.isAbsent(value)) {
        return ":workspaceId";
      }
      if (value === all) {
        return "all";
      }
      return value.toString();
    },
  },
  client: {
    isAll: (value: unknown): value is All => value === all,
    ofAll: (): All => all,
    switchAll: <T>(value: ClientSpec, switchTo: T) =>
      value === all ? switchTo : value,
    fromString: (value: ClientPathSegment): ClientSpec => {
      if (value === "all") {
        return all;
      }
      return parseInt(value, 10);
    },
    toString: (value: ClientParam): ClientPathSegment => {
      if (maybe.isAbsent(value)) {
        return ":clientId";
      }
      if (value === all) {
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
