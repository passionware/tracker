import { Workspace } from "@/api/workspace/workspace.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";

export function WorkspaceHiddenBadge(props: {
  hidden: Workspace["hidden"];
  className?: string;
}) {
  if (!props.hidden) {
    return null;
  }
  return (
    <Badge
      tone="secondary"
      variant="neutral"
      size="sm"
      className={cn("shrink-0 font-medium", props.className)}
    >
      Hidden
    </Badge>
  );
}
