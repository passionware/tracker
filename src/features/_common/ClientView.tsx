import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";
import { getInitials } from "@/platform/lang/getInitials.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { Maybe, rd, RemoteData } from "@passionware/monads";
import { cva, VariantProps } from "class-variance-authority";
import { TriangleAlert } from "lucide-react";

export interface Client {
  id: number;
  name: string;
  avatarUrl: Maybe<string>;
}

export interface ClientViewProps
  extends VariantProps<typeof clientViewVariants> {
  client: RemoteData<Client>;
  layout?: "full" | "avatar";
  className?: string;
}

const clientViewVariants = cva("border border-slate-950/10", {
  variants: {
    size: { xs: "size-4", sm: "size-6", md: "size-8", lg: "size-12" },
  },
  defaultVariants: {
    size: "md",
  },
});

export function ClientView({
  client,
  layout,
  size,
  className,
}: ClientViewProps) {
  const avatar = (
    <Avatar className={cn(clientViewVariants({ size }), className)}>
      {rd
        .journey(client)
        .wait(<Skeleton className="size-8 rounded-full" />)
        .catch(() => (
          <AvatarFallback>
            <TriangleAlert />
          </AvatarFallback>
        ))
        .map((client) => (
          <>
            {client.avatarUrl && (
              <AvatarImage src={client.avatarUrl} alt={client.name} />
            )}
            <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
          </>
        ))}
    </Avatar>
  );

  if (layout === "avatar") {
    return (
      <SimpleTooltip title={rd.tryGet(client)?.name}>{avatar}</SimpleTooltip>
    );
  }

  return (
    <div className="flex items-center flex-row gap-2 text-xs whitespace-pre">
      {avatar}
      {rd
        .journey(client)
        .wait(<Skeleton className="w-20" />)
        .catch(() => "error")
        .map((client) => client.name)}
    </div>
  );
}

export type ClientWidgetProps = Omit<ClientViewProps, "client"> &
  WithServices<[WithClientService]> & {
    clientId: Maybe<number>;
  };

export function ClientWidget({ clientId, ...props }: ClientWidgetProps) {
  const client = props.services.clientService.useClient(clientId);
  return <ClientView client={client} {...props} />;
}
