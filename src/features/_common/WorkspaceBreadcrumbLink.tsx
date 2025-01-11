import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import { BreadcrumbLink } from "@/components/ui/breadcrumb.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { getInitials } from "@/platform/lang/getInitials.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import {
  routingUtils,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd } from "@passionware/monads";

export function WorkspaceBreadcrumbLink(
  props: { workspaceId: WorkspaceSpec } & WithServices<[WithWorkspaceService]>,
) {
  const workspace = props.services.workspaceService.useWorkspace(
    routingUtils.workspace.switchAll(props.workspaceId, null),
  );
  return (
    <BreadcrumbLink>
      {routingUtils.workspace.isAll(props.workspaceId) ? (
        <>All workspaces</>
      ) : (
        rd
          .journey(workspace)
          .wait(<Skeleton className="w-20 h-4" />)
          .catch(renderSmallError("w-20 h-4"))
          .map((x) => (
            <div className="flex flex-row gap-2">
              <Avatar className="size-5">
                {x.avatarUrl && <AvatarImage src={x.avatarUrl} alt={x.name} />}
                <AvatarFallback>{getInitials(x.name)}</AvatarFallback>
              </Avatar>
              {x.name}
            </div>
          ))
      )}
    </BreadcrumbLink>
  );
}
