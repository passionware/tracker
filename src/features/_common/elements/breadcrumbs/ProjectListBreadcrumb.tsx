import { myRouting } from "@/routing/myRouting.ts";
import { BreadcrumbLink } from "@/components/ui/breadcrumb.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/routing/routingUtils.ts";
import { Link } from "react-router-dom";

export function ProjectListBreadcrumb(
  props: WithFrontServices & {
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  return (
    <BreadcrumbLink asChild>
      <Link
        to={myRouting
          .forWorkspace(props.workspaceId)
          .forClient(props.clientId)
          .allProjects()}
      >
        Projects
      </Link>
    </BreadcrumbLink>
  );
}
