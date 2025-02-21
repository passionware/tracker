import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { Project } from "@/api/project/project.api.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { Maybe } from "@passionware/monads";
import { ReactNode } from "react";

/**
 * LocationService is responsible for managing the current client id and other location-related state.
 */
export interface LocationService {
  // maybe - we can be in the route which neither specific client nor all clients
  useCurrentClientId: () => Maybe<ClientSpec>;
  // maybe - we can be in the route which neither specific workspace nor all workspaces
  useCurrentWorkspaceId: () => Maybe<WorkspaceSpec>;
  // maybe - we can be in the route which neither specific client nor all clients
  useCurrentProjectId: () => Maybe<Project["id"]>;
  useCurrentProjectIterationStatus: () => Maybe<"all" | "active" | "closed">;
  useCurrentProjectIterationId: () => Maybe<ProjectIteration["id"]>;
  useCurrentProjectIterationTab: () => Maybe<
    "positions" | "reports" | "billings"
  >;
  // maybe - we can be in the route which neither specific client nor all clients
  getCurrentClientId: () => Maybe<ClientSpec>;
  // maybe - we can be in the route which neither specific workspace nor all workspaces
  getCurrentWorkspaceId: () => Maybe<WorkspaceSpec>;
  // maybe - we can be in the route which neither specific client nor all clients
  getCurrentProjectId: () => Maybe<Project["id"]>;
  getCurrentProjectIterationStatus: () => Maybe<"all" | "active" | "closed">;
  getCurrentProjectIterationId: () => Maybe<ProjectIteration["id"]>;
  changeCurrentClientId: (id: ClientSpec) => void;
  changeCurrentWorkspaceId: (id: WorkspaceSpec) => void;

  Resolver: (props: {
    children: (params: {
      workspaceId: Maybe<WorkspaceSpec>;
      clientId: Maybe<ClientSpec>;
      projectId: Maybe<Project["id"]>;
      projectIterationStatus: Maybe<"all" | "active" | "closed">;
      projectIterationId: Maybe<ProjectIteration["id"]>;
      projectIterationTab: Maybe<"positions" | "reports" | "billings">;
    }) => ReactNode;
  }) => ReactNode;
}
export interface WithLocationService {
  locationService: LocationService;
}
