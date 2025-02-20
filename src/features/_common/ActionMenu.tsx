import { Button, ButtonProps } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { cn } from "@/lib/utils.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { DropdownMenuItemProps } from "@radix-ui/react-dropdown-menu";
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { createContext, ReactNode, useContext, useMemo } from "react";

export interface ActionMenuProps
  extends WithServices<[WithPreferenceService]>,
    ButtonProps {
  children: ReactNode;
}

const ctx = createContext<{ isDangerMode: boolean }>({ isDangerMode: false });

export function ActionMenu({
  children,
  services,
  className,
  ...rest
}: ActionMenuProps) {
  const isDangerMode = services.preferenceService.useIsDangerMode();
  const ctxValue = useMemo(() => ({ isDangerMode }), [isDangerMode]);
  return (
    <ctx.Provider value={ctxValue}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn("-m-1", className)}
            {...rest}
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    </ctx.Provider>
  );
}

export function ActionMenuDeleteItem({
  children,
  ...rest
}: DropdownMenuItemProps) {
  const { isDangerMode } = useContext(ctx);
  return (
    <DropdownMenuItem disabled={!isDangerMode} {...rest}>
      <Trash2 />
      {children}
    </DropdownMenuItem>
  );
}

export function ActionMenuCopyItem({
  children,
  copyText,
  ...rest
}: DropdownMenuItemProps & { copyText: string }) {
  return (
    <DropdownMenuItem
      {...rest}
      onClick={(event) => {
        void navigator.clipboard.writeText(copyText);
        rest.onClick?.(event);
      }}
    >
      <Copy />
      {children}
    </DropdownMenuItem>
  );
}

export function ActionMenuEditItem({
  children,
  ...rest
}: DropdownMenuItemProps) {
  return (
    <DropdownMenuItem {...rest}>
      <Pencil />
      {children}
    </DropdownMenuItem>
  );
}
