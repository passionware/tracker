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
};

export interface RoutingService {
  forWorkspace: (workspaceId?: WorkspaceParam) => {
    root: () => string;
    forClient: (clientId?: ClientParam) => {
      flowRoot: () => string;
      reports: () => string;
      charges: () => string;
      costs: () => string;
      environmentRoot: () => string;
      variables: () => string;
      potentialCosts: () => string;
      root: () => string;
      forContractor: (contractorId?: ContractorParam) => {
        root: () => string;
      };
      projectsRoot: () => string;
      allProjects: () => string;
      activeProjects: () => string;
      closedProjects: () => string;
      forProject: (projectId?: string | ":projectId") => {
        root: () => string;
        iterations: (
          status?: "all" | "active" | "closed" | ":projectIterationStatus",
        ) => string;
        contractors: () => string;
        details: () => string;
        forIteration: (iterationId?: string | ":iterationId") => {
          root: () => string;
          events: () => string;
          reports: () => string;
          billings: () => string;
        };
      };
    };
  };

  forGlobal: () => {
    root: () => string;
  };
}
export interface WithRoutingService {
  routingService: RoutingService;
}
