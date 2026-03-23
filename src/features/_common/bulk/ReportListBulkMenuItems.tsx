import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu.tsx";
import { Trash2, Wallet } from "lucide-react";

export interface ReportListBulkMenuItemsProps {
  selectedCount: number;
  onCreateCost: () => void;
  onDeleteRequest: () => void;
  /** Defaults to "Delete" (list toolbar); use e.g. "Delete reports" on the timeline bar. */
  deleteLabel?: string;
}

export function ReportListBulkMenuItems({
  selectedCount,
  onCreateCost,
  onDeleteRequest,
  deleteLabel = "Delete",
}: ReportListBulkMenuItemsProps) {
  const disabled = selectedCount === 0;
  return (
    <>
      <DropdownMenuItem disabled={disabled} onSelect={onCreateCost}>
        <Wallet className="h-4 w-4" />
        Create cost for selected
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructrive"
        disabled={disabled}
        onSelect={(e) => {
          e.preventDefault();
          onDeleteRequest();
        }}
      >
        <Trash2 className="h-4 w-4" />
        {deleteLabel}
      </DropdownMenuItem>
    </>
  );
}
