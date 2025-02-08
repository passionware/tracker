import { BreadcrumbLink } from "@/components/ui/breadcrumb.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { Link } from "react-router-dom";

export function ProjectListBreadcrumb(
  props: WithFrontServices & {
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  return (
    <BreadcrumbLink>
      <Link
        to={props.services.routingService
          .forWorkspace(props.workspaceId)
          .forClient(props.clientId)
          .allProjects()}
      >
        Projects
      </Link>
    </BreadcrumbLink>
  );
}
