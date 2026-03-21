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
import { ComponentPropsWithRef, ReactNode } from "react";
import React from "react";

export type AbstractEntityViewProps = SwitchProps<
  ComponentPropsWithRef<"div">,
  "children",
  VariantProps<typeof entityViewVariants> & {
    layout?: "full" | "avatar";
    entity: RemoteData<{
      name: string;
      avatarUrl: Maybe<string>;
      icon?: React.ReactNode;
    }>;
    /** When set (e.g. multi-picker options), avatar toggles; right-hand strip is exclusive select. */
    multiPickerOptionZones?: {
      onAvatarClick: (e: React.MouseEvent) => void;
      onRightPartClick: (e: React.MouseEvent) => void;
    };
    /** Rendered inside the right-hand strip (e.g. row checkmark). */
    multiPickerTrailing?: ReactNode;
    /** Pointer enter/leave on exclusive strip (parent dims other rows' strips). */
    multiPickerExclusiveHover?: {
      onPointerEnter: () => void;
      onPointerLeave: () => void;
    };
    /** When another row's exclusive strip is hovered, fade this row's strip (not the avatar). */
    multiPickerDimExclusiveStrip?: boolean;
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

function optionZoneClick(
  e: React.MouseEvent,
  handler: (e: React.MouseEvent) => void,
) {
  e.preventDefault();
  e.stopPropagation();
  handler(e);
}

export function AbstractEntityView({
  entity,
  layout = "full",
  className,
  size,
  multiPickerOptionZones,
  multiPickerTrailing,
  multiPickerExclusiveHover,
  multiPickerDimExclusiveStrip,
}: AbstractEntityViewProps) {
  const avatar = (
    <Avatar
      className={cn(
        entityViewVariants({ size }),
        layout !== "avatar" ? "" : className,
      )}
    >
      {rd
        .fullJourney(entity)
        .initially(
          <SimpleTooltip title="No workspace">
            <CircleSlash className="w-full h-full text-muted-foreground" />
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

  const entityData = rd.useLastWithPlaceholder(entity);
  const entityValue = rd.tryGet(entityData);
  const icon = entityValue?.icon;
  const hasIcon = icon !== undefined && icon !== null;

  if (layout === "avatar") {
    if (hasIcon) {
      return (
        <SimpleTooltip title={rd.tryGet(entity)?.name}>
          <div
            className={cn(
              entityViewVariants({ size }),
              className,
              "flex items-center justify-center",
              multiPickerOptionZones && "cursor-pointer touch-manipulation",
            )}
            onClick={
              multiPickerOptionZones
                ? (e) =>
                    optionZoneClick(e, multiPickerOptionZones.onAvatarClick)
                : undefined
            }
          >
            {icon}
          </div>
        </SimpleTooltip>
      );
    }
    const avatarEl = multiPickerOptionZones ? (
      <span
        className="inline-flex cursor-pointer touch-manipulation"
        onClick={(e) =>
          optionZoneClick(e, multiPickerOptionZones.onAvatarClick)
        }
      >
        {avatar}
      </span>
    ) : (
      avatar
    );
    return (
      <SimpleTooltip title={rd.tryGet(entity)?.name}>{avatarEl}</SimpleTooltip>
    );
  }

  const lead = hasIcon ? (
    <div
      className={cn(
        entityViewVariants({ size }),
        "flex items-center justify-center",
        multiPickerOptionZones && "cursor-pointer touch-manipulation",
      )}
      onClick={
        multiPickerOptionZones
          ? (e) => optionZoneClick(e, multiPickerOptionZones.onAvatarClick)
          : undefined
      }
    >
      {icon}
    </div>
  ) : multiPickerOptionZones ? (
    <span
      className="inline-flex shrink-0 cursor-pointer touch-manipulation"
      onClick={(e) => optionZoneClick(e, multiPickerOptionZones.onAvatarClick)}
    >
      {avatar}
    </span>
  ) : (
    avatar
  );

  if (!multiPickerOptionZones) {
    return (
      <div
        className={cn(
          "flex items-center flex-row gap-2 text-xs whitespace-pre text-foreground",
          className,
        )}
      >
        {lead}
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

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-1 items-stretch gap-0 self-stretch text-xs whitespace-pre text-foreground",
        className,
      )}
    >
      {/*
        No padding on this outer row: padding would receive clicks and bubble to cmdk Item (toggle).
        Inset lives inside the two columns; padding is part of each column’s box so clicks stay routed.
      */}
      <div
        className="flex shrink-0 cursor-pointer touch-manipulation items-center py-1.5 pl-2"
        onClick={(e) =>
          optionZoneClick(e, multiPickerOptionZones.onAvatarClick)
        }
      >
        {lead}
      </div>
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 cursor-pointer touch-manipulation items-center gap-2 py-1.5 pl-2 pr-2",
          "transition-opacity duration-200 ease-out motion-reduce:transition-none",
          multiPickerDimExclusiveStrip &&
            "opacity-40 motion-reduce:opacity-100",
        )}
        onClick={(e) =>
          optionZoneClick(e, multiPickerOptionZones.onRightPartClick)
        }
        onPointerEnter={multiPickerExclusiveHover?.onPointerEnter}
        onPointerLeave={multiPickerExclusiveHover?.onPointerLeave}
      >
        <span className="min-w-0 flex-1 truncate">
          {rd
            .fullJourney(entity)
            .initially("Not assigned")
            .wait(<Skeleton className="w-20" />)
            .catch(() => "error")
            .map((entity) => entity.name)}
        </span>
        {multiPickerTrailing != null ? (
          <span className="ml-auto shrink-0">{multiPickerTrailing}</span>
        ) : null}
      </div>
    </div>
  );
}
