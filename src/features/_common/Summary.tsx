import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils";
import { ComponentPropsWithRef, ReactNode } from "react";

const summaryGridClass =
  "mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4";

const summaryStripClass =
  "flex min-w-0 flex-row flex-wrap items-baseline justify-end gap-x-3 gap-y-0.5 sm:gap-x-5 md:gap-x-6";

export function Summary({
  variant = "grid",
  className,
  children,
}: {
  variant?: "grid" | "strip";
  className?: string;
  children: ReactNode;
}) {
  return (
    <dl
      className={cn(
        variant === "strip" ? summaryStripClass : summaryGridClass,
        className,
      )}
    >
      {children}
    </dl>
  );
}

export function SummaryEntry({
  label,
  description,
  className,
  children,
  variant = "card",
}: {
  label: ReactNode;
  description?: ReactNode;
  variant?: "card" | "strip";
} & ComponentPropsWithRef<"div">) {
  if (variant === "strip") {
    const labelBody = description ? (
      <SimpleTooltip title={description}>
        <span className="cursor-help border-b border-dotted border-muted-foreground/50">
          {label}
        </span>
      </SimpleTooltip>
    ) : (
      <span>{label}</span>
    );
    return (
      <div
        className={cn(
          "flex shrink-0 flex-row items-baseline gap-1.5 border-l border-border/60 pl-2.5 first:border-l-0 first:pl-0 sm:gap-2 sm:pl-3 md:pl-4",
          className,
        )}
      >
        <dt className="shrink-0 text-[10px] font-semibold uppercase leading-none tracking-wide text-muted-foreground">
          {labelBody}
        </dt>
        <dd className="min-w-0 text-sm font-semibold tabular-nums leading-none tracking-tight text-foreground">
          {children}
        </dd>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card/60 px-4 py-4 backdrop-blur-[2px] sm:px-5 sm:py-5",
        className,
      )}
    >
      <dt>
        <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        {description && (
          <div className="mt-1 mb-2 text-xs leading-snug text-muted-foreground/90">
            {description}
          </div>
        )}
      </dt>
      <dd className="mt-2 flex flex-col items-start gap-2 text-xl font-semibold tabular-nums tracking-tight text-foreground">
        {children}
      </dd>
    </div>
  );
}

export function SummaryEntryValue({
  className,
  compact,
  ...props
}: ComponentPropsWithRef<"div"> & { compact?: boolean }) {
  return (
    <div
      className={cn(
        compact
          ? "text-sm font-semibold tabular-nums tracking-tight text-foreground"
          : "rounded-lg border border-border/70 bg-muted/40 px-2 py-1.5 text-right text-base font-semibold tabular-nums",
        className,
      )}
      {...props}
    />
  );
}
