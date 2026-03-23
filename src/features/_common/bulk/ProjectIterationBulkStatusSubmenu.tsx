import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { ListOrdered } from "lucide-react";

export type ProjectIterationBulkStatus = "draft" | "active" | "closed";

export interface ProjectIterationBulkStatusSubmenuProps {
  mutationInProgress: boolean;
  onStatusChange: (status: ProjectIterationBulkStatus) => void;
  /**
   * When true, all items show "Updating…" while the mutation runs (list toolbar UX).
   * When false, labels stay Draft/Active/Closed (e.g. floating bar).
   */
  busyItemLabels?: boolean;
}

export function ProjectIterationBulkStatusSubmenu({
  mutationInProgress,
  onStatusChange,
  busyItemLabels = false,
}: ProjectIterationBulkStatusSubmenuProps) {
  const labelFor = (name: string) =>
    busyItemLabels && mutationInProgress ? "Updating..." : name;

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={mutationInProgress}>
        <ListOrdered className="h-4 w-4" />
        Change iteration status
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem
          onSelect={() => onStatusChange("draft")}
          disabled={mutationInProgress}
        >
          {labelFor("Draft")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => onStatusChange("active")}
          disabled={mutationInProgress}
        >
          {labelFor("Active")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => onStatusChange("closed")}
          disabled={mutationInProgress}
        >
          {labelFor("Closed")}
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
