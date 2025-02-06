import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/ClientBreadcrumbLink.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/WorkspaceBreadcrumbLink.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";

export interface ProjectListWidgetProps
  extends WithServices<[WithWorkspaceService, WithClientService]> {
  filter: unknown; // something like all/current/past - should be part of ProjectQuery?
  clientId: ClientSpec;
  workspaceId: WorkspaceSpec;
}

export function ProjectListWidget(props: ProjectListWidgetProps) {
  return (
    <CommonPageContainer
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <BreadcrumbPage>Projects</BreadcrumbPage>,
      ]}
      tools={<></>}
    >
      Content
    </CommonPageContainer>
  );
}
