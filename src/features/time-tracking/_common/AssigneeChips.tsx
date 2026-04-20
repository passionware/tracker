import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";

/**
 * Renders a compact avatar row for a task's assignees.
 *
 * Assignees are Supabase `auth.users.id` values — until we wire a
 * user-profile service we can't turn them into human names for
 * everyone, but we special-case the currently signed-in user (so you
 * can instantly see "this is mine") and short-hash the rest.
 *
 * The row collapses to a single "+N" chip beyond `maxVisible`.
 */
export function AssigneeChips(props: {
  assignees: string[];
  currentUserId?: string | null;
  maxVisible?: number;
  className?: string;
  size?: "sm" | "xs";
}) {
  const max = props.maxVisible ?? 3;
  if (props.assignees.length === 0) {
    return (
      <span
        className={cn("text-xs text-muted-foreground", props.className)}
      >
        Unassigned
      </span>
    );
  }
  const visible = props.assignees.slice(0, max);
  const overflow = props.assignees.length - visible.length;
  const dim = props.size === "xs" ? "size-4" : "size-5";
  const isYou = (id: string) =>
    props.currentUserId !== null &&
    props.currentUserId !== undefined &&
    id === props.currentUserId;

  return (
    <div
      className={cn("flex items-center -space-x-1", props.className)}
    >
      {visible.map((id) => (
        <Tooltip key={id}>
          <TooltipTrigger asChild>
            <Avatar
              className={cn(
                dim,
                "ring-2 ring-background",
                isYou(id) && "ring-emerald-400",
              )}
            >
              <AvatarFallback
                className={cn(
                  "text-[9px]",
                  isYou(id) &&
                    "bg-emerald-100 text-emerald-900 font-medium",
                )}
              >
                {initialsForAuthId(id, isYou(id))}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent className="font-mono text-[10px]">
            {isYou(id) ? `You (${id.slice(0, 8)})` : id}
          </TooltipContent>
        </Tooltip>
      ))}
      {overflow > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              tone="secondary"
              variant="neutral"
              className="h-5 px-1.5 text-[10px] tabular-nums ring-2 ring-background"
            >
              +{overflow}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="font-mono text-[10px]">
            {props.assignees
              .slice(max)
              .map((id) => id.slice(0, 8))
              .join(", ")}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

function initialsForAuthId(id: string, isYou: boolean): string {
  if (isYou) return "Me";
  // Derive two letters from the uuid so the avatar isn't all identical
  // `?`s. Uuids are hex so the glyph set is always a-f0-9, which
  // renders predictably in the avatar fallback.
  const a = id.charAt(0);
  const b = id.charAt(id.length - 1);
  return `${a}${b}`.toUpperCase();
}
