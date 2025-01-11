import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/ClientBreadcrumbLink.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/WorkspaceBreadcrumbLink.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import {
  ClientSpec,
  WithRoutingService,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { Link } from "react-router-dom";

export interface DashboardProps
  extends WithServices<
    [WithClientService, WithWorkspaceService, WithRoutingService]
  > {
  clientId: ClientSpec;
  workspaceId: WorkspaceSpec;
}
export function Dashboard(props: DashboardProps) {
  return (
    <CommonPageContainer
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <BreadcrumbPage>Client Invoices</BreadcrumbPage>,
      ]}
    >
      <div>Dashboard</div>
      <div className="p-10 text-3xl text-opacity-50 grid grid-flow-col items-stretch justify-stretch justify-items-stretch *:w-full *:aspect-square gap-24 *:flex *:items-center *:justify-center">
        <Link
          className="bg-gradient-to-tl from-fuchsia-500 to-blue-400 text-white p-2 rounded-md inline-block w-fit hover:brightness-110 transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 focus-visible:ring-white"
          to={props.services.routingService
            .forWorkspace(props.workspaceId)
            .forClient(props.clientId)
            .reports()}
        >
          Reports
        </Link>
        <Link
          className="bg-gradient-to-tl from-fuchsia-500 to-blue-400 text-white p-2 rounded-md inline-block w-fit hover:brightness-110 transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 focus-visible:ring-white"
          to={props.services.routingService
            .forWorkspace(props.workspaceId)
            .forClient(props.clientId)
            .charges()}
        >
          Charges
        </Link>
        <Link
          className="bg-gradient-to-tl from-fuchsia-500 to-blue-400 text-white p-2 rounded-md inline-block w-fit hover:brightness-110 transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 focus-visible:ring-white"
          to={props.services.routingService
            .forWorkspace(props.workspaceId)
            .forClient(props.clientId)
            .costs()}
        >
          Costs
        </Link>
      </div>
    </CommonPageContainer>
  );
}
