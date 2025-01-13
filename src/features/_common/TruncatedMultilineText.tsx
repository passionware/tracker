import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";
import { ReactNode } from "react";

export interface TruncatedMultilineTextProps {
  children: ReactNode;
  maxLines?: number;
  className?: string;
}

export function TruncatedMultilineText({
  children,
  maxLines = 6,
  className,
}: TruncatedMultilineTextProps) {
  return (
    <SimpleTooltip title={children} delayDuration={1000}>
      <div
        style={{
          // @ts-expect-error -webkit-line-clamp is not in the CSSStyleDeclaration
          webkitLineClamp: maxLines?.toString(),
        }}
        className={cn(
          "line-clamp-1 overflow-hidden text-ellipsis break-all text-xs leading-3 text-slate-800",
          className,
        )}
      >
        {children ?? "N/A"}
      </div>
    </SimpleTooltip>
  );
}
