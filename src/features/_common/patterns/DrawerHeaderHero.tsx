import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import type { ReactNode } from "react";

export type DrawerHeaderHeroProps = {
  avatarUrl?: string | null;
  /** Passed to `AvatarImage` when `avatarUrl` is set. */
  avatarAlt?: string;
  fallbackInitials: string;
  title: string;
  /** e.g. hidden badge beside the title */
  titleAdornment?: ReactNode;
  meta: ReactNode;
};

/**
 * Shared header layout for entity drawers (client, workspace): avatar, prominent title,
 * and a responsive metadata row. Prefer this over duplicating `DrawerMainInfoGrid` in the header.
 */
export function DrawerHeaderHero({
  avatarUrl,
  avatarAlt = "",
  fallbackInitials,
  title,
  titleAdornment,
  meta,
}: DrawerHeaderHeroProps) {
  return (
    <div className="flex gap-4 sm:items-start">
      <Avatar className="size-14 shrink-0 rounded-lg">
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt={avatarAlt} />
        ) : null}
        <AvatarFallback className="rounded-lg text-base">
          {fallbackInitials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <div className="min-w-0 max-w-full truncate text-lg font-semibold leading-snug tracking-tight text-foreground">
            {title}
          </div>
          {titleAdornment}
        </div>
        <div className="flex flex-col gap-1.5 text-sm sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-1">
          {meta}
        </div>
      </div>
    </div>
  );
}

export function DrawerHeaderHeroMetaItem({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <span className={cn("min-w-0", className)}>
      <span className="text-muted-foreground">{label}</span>{" "}
      <span className={cn("font-medium text-foreground", valueClassName)}>
        {value}
      </span>
    </span>
  );
}

export function DrawerHeaderHeroSkeleton() {
  return (
    <div className="flex gap-4">
      <Skeleton className="size-14 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-7 max-w-[14rem]" />
        <Skeleton className="h-4 max-w-md" />
      </div>
    </div>
  );
}
