import { SidebarTrigger } from "@/components/ui/sidebar.tsx";
import { cn } from "@/lib/utils.ts";
import { ComponentProps } from "react";

/**
 * Mobile-only variant of `SidebarTrigger`, intended to be rendered inline with a
 * page's primary header so the nav handle sits on the same row as the title.
 * Hidden from `md` and up, where the desktop sidebar/trigger is visible.
 */
export function MobileSidebarTrigger({
  className,
  ...rest
}: ComponentProps<typeof SidebarTrigger>) {
  return (
    <SidebarTrigger
      className={cn("-ml-1 shrink-0 md:hidden", className)}
      {...rest}
    />
  );
}
