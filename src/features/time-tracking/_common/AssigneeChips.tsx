import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
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
 * Assignees are `contractor.id` values. Each chip resolves to a
 * `ContractorWidget` which pulls name/avatar from the ContractorService
 * cache, so the row progressively fills in as the cache warms up.
 *
 * The row collapses to a single "+N" chip beyond `maxVisible`.
 *
 * `currentContractorId` highlights the signed-in-contractor's chip with
 * an emerald ring so the viewer can instantly see "this is mine".
 */
export function AssigneeChips(
  props: WithFrontServices & {
    assignees: number[];
    currentContractorId?: number | null;
    maxVisible?: number;
    className?: string;
    size?: "sm" | "xs";
  },
) {
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
  const isYou = (id: number) =>
    props.currentContractorId !== null &&
    props.currentContractorId !== undefined &&
    id === props.currentContractorId;

  return (
    <div
      className={cn(
        "flex items-center gap-1 flex-wrap",
        props.className,
      )}
    >
      {visible.map((id) => (
        <span
          key={id}
          className={cn(
            "inline-flex items-center rounded-full border bg-background px-1.5 py-0.5 text-[11px]",
            isYou(id) && "ring-2 ring-emerald-400 border-emerald-300",
            props.size === "xs" && "text-[10px] px-1",
          )}
        >
          <ContractorWidget
            services={props.services}
            contractorId={id}
            size="sm"
          />
          {isYou(id) ? (
            <span className="ml-1 text-[9px] font-medium text-emerald-700">
              you
            </span>
          ) : null}
        </span>
      ))}
      {overflow > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              tone="secondary"
              variant="neutral"
              className="h-5 px-1.5 text-[10px] tabular-nums"
            >
              +{overflow}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="text-[10px]">
            {props.assignees.slice(max).join(", ")}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
