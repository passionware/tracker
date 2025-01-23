import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";
import { getInitials } from "@/platform/lang/getInitials.ts";
import { SwitchProps } from "@/platform/typescript/SwitchProps.ts";
import { Maybe, rd, RemoteData } from "@passionware/monads";
import { cva, VariantProps } from "class-variance-authority";
import { CircleSlash, TriangleAlert } from "lucide-react";
import { ComponentPropsWithRef } from "react";

export type AbstractEntityViewProps = SwitchProps<
  ComponentPropsWithRef<"div">,
  "children",
  VariantProps<typeof entityViewVariants> & {
    layout?: "full" | "avatar";
    entity: RemoteData<{ name: string; avatarUrl: Maybe<string> }>;
  }
>;

const entityViewVariants = cva("", {
  variants: {
    size: {
      xs: "size-5 text-[6pt]",
      sm: "size-7 text-[8pt]",
      md: "size-8",
      lg: "size-9",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export function AbstractEntityView({
  entity,
  layout,
  className,
  size,
}: AbstractEntityViewProps) {
  const avatar = (
    <Avatar className={cn(entityViewVariants({ size }), className)}>
      {rd
        .fullJourney(entity)
        .initially(
          <SimpleTooltip title="No workspace">
            <CircleSlash className="w-full h-full text-slate-400" />
          </SimpleTooltip>,
        )
        .wait(<Skeleton className="size-8 rounded-full" />)
        .catch(() => (
          <AvatarFallback>
            <TriangleAlert />
          </AvatarFallback>
        ))
        .map((entity) => (
          <>
            {entity.avatarUrl && (
              <AvatarImage src={entity.avatarUrl} alt={entity.name} />
            )}
            <AvatarFallback>{getInitials(entity.name)}</AvatarFallback>
          </>
        ))}
    </Avatar>
  );

  if (layout === "avatar") {
    return (
      <SimpleTooltip title={rd.tryGet(entity)?.name}>{avatar}</SimpleTooltip>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center flex-row gap-2 text-xs whitespace-pre",
        className,
      )}
    >
      {avatar}
      <span className="min-w-0 truncate">
        {rd
          .fullJourney(entity)
          .initially("Not assigned")
          .wait(<Skeleton className="w-20" />)
          .catch(() => "error")
          .map((entity) => entity.name)}
      </span>
    </div>
  );
}
