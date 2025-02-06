import { projectQueryUtils } from "@/api/project/project.api.ts";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/ClientBreadcrumbLink.tsx";
import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns.tsx";
import { project } from "@/features/_common/columns/project.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ProjectQueryBar } from "@/features/_common/elements/query/ProjectQueryBar.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/WorkspaceBreadcrumbLink.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ClientSpec,
  WithRoutingService,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithProjectService } from "@/services/io/ProjectService/ProjectService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { useState } from "react";

export interface ProjectListWidgetProps
  extends WithServices<
    [
      WithWorkspaceService,
      WithClientService,
      WithProjectService,
      WithFormatService,
      WithContractorService,
      WithRoutingService,
    ]
  > {
  filter: unknown; // something like all/current/past - should be part of ProjectQuery?
  clientId: ClientSpec;
  workspaceId: WorkspaceSpec;
}

export function ProjectListWidget(props: ProjectListWidgetProps) {
  const [_query, setQuery] = useState(projectQueryUtils.ofDefault());
  const query = projectQueryUtils.ensureDefault(_query, props);
  const projects = props.services.projectService.useProjects(query);

  return (
    <CommonPageContainer
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <BreadcrumbPage>Projects</BreadcrumbPage>,
      ]}
      tools={
        <>
          <ProjectQueryBar
            query={query}
            onQueryChange={setQuery}
            services={props.services}
            spec={{
              workspace: idSpecUtils.takeOrElse(
                props.workspaceId,
                "disable",
                "show",
              ),
              client: idSpecUtils.takeOrElse(props.clientId, "disable", "show"),
              contractor: "hide",
            }}
          />
        </>
      }
    >
      <ListView
        query={query}
        onQueryChange={setQuery}
        data={projects}
        columns={[
          ...sharedColumns.getContextualForIds(
            {
              workspaceId: props.workspaceId,
              clientId: props.clientId,
            },
            props.services,
          ),
          project.name(props.services, props),
          project.createdAt(props.services),
          project.status,
        ]}
      />
    </CommonPageContainer>
  );
}
