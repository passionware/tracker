import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Button, ButtonProps } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { MarkAsPaidDialog } from "@/features/billing/MarkAsPaidDialog.tsx";
import { cn } from "@/lib/utils.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { CalendarDate } from "@internationalized/date";
import { DropdownMenuItemProps } from "@radix-ui/react-dropdown-menu";
import {
  Banknote,
  ClipboardCopy,
  Copy,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { createContext, ReactNode, useContext, useMemo, useState } from "react";

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
    <DropdownMenuItem disabled={!isDangerMode} variant="destructrive" {...rest}>
      <Trash2 className="size-4" />
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
      <ClipboardCopy className="size-4" />
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
      <Pencil className="size-4" />
      {children}
    </DropdownMenuItem>
  );
}

export function ActionMenuDuplicateItem({
  children,
  ...rest
}: DropdownMenuItemProps) {
  return (
    <DropdownMenuItem {...rest}>
      <Copy className="size-4" />
      {children}
    </DropdownMenuItem>
  );
}

export function ActionMenuMarkPaidMenuItem({
  children,
  billingId,
  paidAt,
  services,
  ...rest
}: DropdownMenuItemProps &
  WithServices<[WithMutationService]> & {
    billingId: number;
    paidAt: CalendarDate | null;
  }) {
  const [markOpen, setMarkOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);
  const isPaid = paidAt != null;

  return (
    <>
      <DropdownMenuItem
        {...rest}
        onSelect={(event) => {
          event.preventDefault();
          if (isPaid) {
            setClearOpen(true);
          } else {
            setMarkOpen(true);
          }
        }}
      >
        {isPaid ? (
          <RotateCcw className="size-4" />
        ) : (
          <Banknote className="size-4" />
        )}
        {children ?? (isPaid ? "Remove paid marker" : "Mark as paid")}
      </DropdownMenuItem>
      <MarkAsPaidDialog
        open={markOpen}
        onOpenChange={setMarkOpen}
        title="Mark invoice as paid"
        onConfirm={async (data) => {
          await services.mutationService.editBilling(billingId, {
            paidAt: data.paidAt,
            paidAtJustification: data.paidAtJustification,
          });
        }}
      />
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent data-vaul-no-drag>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove paid marker?</AlertDialogTitle>
            <AlertDialogDescription>
              The payment date and note on this invoice will be cleared. You can
              mark it as paid again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={clearBusy}
              onClick={async (e) => {
                e.preventDefault();
                setClearBusy(true);
                try {
                  await services.mutationService.editBilling(billingId, {
                    paidAt: null,
                    paidAtJustification: null,
                  });
                  setClearOpen(false);
                } finally {
                  setClearBusy(false);
                }
              }}
            >
              {clearBusy ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
