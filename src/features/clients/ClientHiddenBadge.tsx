import { Client } from "@/api/clients/clients.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";

export function ClientHiddenBadge(props: {
  hidden: Client["hidden"];
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
