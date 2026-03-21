import { Badge } from "@/components/ui/badge.tsx";
import { Button, ButtonProps } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { cn } from "@/lib/utils";
import { ChevronDown, Layers } from "lucide-react";
import { ReactNode } from "react";

export interface ListToolbarProps {
  children: ReactNode;
  className?: string;
}

export function ListToolbar({ children, className }: ListToolbarProps) {
  return (
    <Card
      className={cn(
        "sticky bottom-0 border-0 rounded-none shadow-lg",
        className,
      )}
    >
      <div className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 px-2 py-1.5 sm:gap-x-3 sm:gap-y-2 sm:px-3 sm:py-2">
        {children}
      </div>
    </Card>
  );
}

export interface ListToolbarButtonProps extends ButtonProps {
  variant?: "default" | "destructive" | "warning" | "accent1" | "accent2";
}

export function ListToolbarButton({ ...props }: ListToolbarButtonProps) {
  return <Button size="sm" {...props} />;
}

export interface ListToolbarDropdownProps {
  children?: ReactNode;
  trigger: ReactNode;
  className?: string;
}

export interface ListToolbarActionsMenuProps {
  /** Number of selected rows — used for badge and default disabled state. */
  selectedCount: number;
  /** When set, overrides `selectedCount === 0` for disabling the trigger. */
  disabled?: boolean;
  titleWhenDisabled?: string;
  /** Shown when disabled and set (e.g. “Updating…”) — overrides `titleWhenDisabled`. */
  disabledReason?: string;
  contentClassName?: string;
  triggerClassName?: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Bulk “Actions” control for list toolbars: always shows a {@link Layers} icon
 * (never label-only). “Actions” text appears from `sm` breakpoint up.
 */
export function ListToolbarActionsMenu({
  selectedCount,
  disabled: disabledOverride,
  titleWhenDisabled = "Select one or more rows",
  disabledReason,
  contentClassName,
  triggerClassName,
  children,
  open,
  onOpenChange,
}: ListToolbarActionsMenuProps) {
  const disabled =
    disabledOverride ?? selectedCount === 0;
  const menuProps =
    open !== undefined
      ? { open, onOpenChange }
      : ({} as { open?: boolean; onOpenChange?: (o: boolean) => void });
  const triggerTitle = disabled
    ? (disabledReason ?? titleWhenDisabled)
    : undefined;

  return (
    <DropdownMenu {...menuProps}>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={cn("h-8 gap-1.5 px-2.5", triggerClassName)}
          disabled={disabled}
          title={triggerTitle}
          aria-label={
            selectedCount > 0
              ? `Actions for ${selectedCount} selected rows`
              : "Bulk actions"
          }
        >
          <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Actions</span>
          {selectedCount > 0 ? (
            <Badge
              variant="secondary"
              size="sm"
              className="ml-1 min-w-5 px-1"
            >
              {selectedCount}
            </Badge>
          ) : null}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn("min-w-[10rem]", contentClassName)}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
