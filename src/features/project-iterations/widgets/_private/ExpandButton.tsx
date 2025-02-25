import { Button, ButtonProps } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import { ChevronRight } from "lucide-react";

export function ExpandButton({
  isExpanded,
  ...props
}: ButtonProps & { isExpanded: boolean }) {
  return (
    <Button variant="ghost" size="xs" {...props}>
      {props.children}
      <ChevronRight
        className={cn(
          "transform transition-transform",
          isExpanded ? "rotate-90" : "rotate-0",
        )}
      />
    </Button>
  );
}
