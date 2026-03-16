import { Card, CardContent } from "@/components/ui/card";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TmetricNoOverlapMessageProps {
  /** "full" = large icon + two paragraphs; "compact" = smaller icon + single line */
  variant?: "full" | "compact";
  className?: string;
}

const MAIN_MESSAGE =
  "Selected time range does not overlap with any iteration.";
const HINT_FULL =
  "Try another time preset above, or pick a custom range that falls within your iterations.";
const HINT_COMPACT = "Try another time preset or a custom range.";

export function TmetricNoOverlapMessage({
  variant = "compact",
  className,
}: TmetricNoOverlapMessageProps) {
  const isFull = variant === "full";
  return (
    <Card className={cn(isFull ? "" : "max-w-md", className)}>
      <CardContent
        className={cn(
          "flex flex-col items-center text-center text-muted-foreground",
          isFull ? "justify-center py-16" : "pt-6 gap-2",
        )}
      >
        <CalendarRange
          className={cn(
            "text-muted-foreground",
            isFull ? "mb-4 h-16 w-16" : "h-12 w-12",
          )}
        />
        <p className={isFull ? "text-muted-foreground text-center" : ""}>
          {MAIN_MESSAGE}
          {!isFull && ` ${HINT_COMPACT}`}
        </p>
        {isFull && (
          <p className="mt-2 text-sm text-muted-foreground text-center">
            {HINT_FULL}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
