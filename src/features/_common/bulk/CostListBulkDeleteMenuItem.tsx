import { DropdownMenuItem } from "@/components/ui/dropdown-menu.tsx";
import { Trash2 } from "lucide-react";

export interface CostListBulkDeleteMenuItemProps {
  selectedCount: number;
  onDeleteRequest: () => void;
  /** e.g. "Delete" (list) vs "Delete costs" (timeline) */
  label?: string;
}

export function CostListBulkDeleteMenuItem({
  selectedCount,
  onDeleteRequest,
  label = "Delete",
}: CostListBulkDeleteMenuItemProps) {
  const disabled = selectedCount === 0;
  return (
    <DropdownMenuItem
      variant="destructrive"
      disabled={disabled}
      onSelect={(e) => {
        e.preventDefault();
        onDeleteRequest();
      }}
    >
      <Trash2 className="h-4 w-4" />
      {label}
    </DropdownMenuItem>
  );
}
