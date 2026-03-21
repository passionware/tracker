import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu.tsx";
import { ListToolbarActionsMenu } from "@/features/_common/ListToolbar.tsx";
import { Banknote, Sparkles, Trash2 } from "lucide-react";

export interface BillingListBulkActionsProps {
  selectedCount: number;
  selectedUnpaidCount: number;
  onMarkPaid: () => void;
  onMatchPayments: () => void;
  onDeleteRequest: () => void;
}

export function BillingListBulkActions({
  selectedCount,
  selectedUnpaidCount,
  onMarkPaid,
  onMatchPayments,
  onDeleteRequest,
}: BillingListBulkActionsProps) {
  const noSelection = selectedCount === 0;
  const noUnpaidSelected = selectedUnpaidCount === 0;

  return (
    <ListToolbarActionsMenu selectedCount={selectedCount}>
      <DropdownMenuItem disabled={noSelection} onSelect={onMarkPaid}>
        <Banknote className="h-4 w-4" />
        Mark as paid
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={onMatchPayments}
        disabled={noSelection || noUnpaidSelected}
        title={
          noUnpaidSelected && !noSelection
            ? "Select at least one unpaid invoice"
            : undefined
        }
      >
        <Sparkles className="h-4 w-4" />
        Match payments (AI)
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructrive"
        disabled={noSelection}
        onSelect={(e) => {
          e.preventDefault();
          onDeleteRequest();
        }}
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </DropdownMenuItem>
    </ListToolbarActionsMenu>
  );
}
