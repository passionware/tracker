import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import { BreadcrumbLink } from "@/components/ui/breadcrumb.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { getInitials } from "@/platform/lang/getInitials.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { ClientSpec } from "@/services/front/RoutingService/RoutingService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { rd } from "@passionware/monads";

export function ClientBreadcrumbLink(
  props: { clientId: ClientSpec } & WithServices<[WithClientService]>,
) {
  const client = props.services.clientService.useClient(
    idSpecUtils.switchAll(props.clientId, null),
  );
  return (
    <BreadcrumbLink>
      {idSpecUtils.isAll(props.clientId) ? (
        <>All clients</>
      ) : (
        rd
          .journey(client)
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
