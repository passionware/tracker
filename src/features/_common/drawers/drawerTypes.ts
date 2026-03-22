import type {
  ClientSpec,
  WorkspaceSpec,
} from "@/routing/routingUtils.ts";

export type DrawerContext = {
  clientId: ClientSpec;
  workspaceId: WorkspaceSpec;
};
