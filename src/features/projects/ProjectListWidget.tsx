import { WithServices } from "@/platform/typescript/services.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";

export interface ProjectListWidgetProps extends WithServices<[]> {
  filter: unknown; // something like all/current/past - should be part of ProjectQuery?
  clientId: ClientSpec;
  workspaceId: WorkspaceSpec;
}

export function ProjectListWidget(props: ProjectListWidgetProps) {
  return <div>ProjectListWidget</div>;
}
