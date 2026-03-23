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
import type { ReactNode } from "react";

export interface BulkDeleteAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  deleteInProgress: boolean;
  onConfirmDelete: () => void | Promise<void>;
  deletingLabel?: string;
  confirmLabel?: string;
}

export function BulkDeleteAlertDialog({
  open,
  onOpenChange,
  title,
  description,
  deleteInProgress,
  onConfirmDelete,
  deletingLabel = "Deleting…",
  confirmLabel = "Delete",
}: BulkDeleteAlertDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteInProgress}
            onClick={onConfirmDelete}
          >
            {deleteInProgress ? deletingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
