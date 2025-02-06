import { WithServices } from "@/platform/typescript/services.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithLocationService } from "@/services/internal/LocationService/LocationService.ts";
import { maybe } from "@passionware/monads";
import { ReactNode } from "react";

export function IdResolver(
  props: WithServices<[WithLocationService]> & {
    children: (workspaceId: WorkspaceSpec, clientId: ClientSpec) => ReactNode;
  },
) {
  const clientId = props.services.locationService.useCurrentClientId();
  const workspaceId = props.services.locationService.useCurrentWorkspaceId();
  return props.children(
    maybe.getOrThrow(workspaceId, "No workspace ID"),
    maybe.getOrThrow(clientId, "No client ID"),
  );
}

export function ProjectIdResolver(
  props: WithServices<[WithLocationService]> & {
    children: (projectId: number) => ReactNode;
  },
) {
  const projectId = props.services.locationService.useCurrentProjectId();
  return props.children(maybe.getOrThrow(projectId, "No project ID"));
}
