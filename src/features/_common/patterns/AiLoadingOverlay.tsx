import { cn } from "@/lib/utils.ts";
import { FileText, Loader2, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export function AiLoadingOverlay({
  title,
  description,
  fileName,
  footerHint,
  clipClassName = "rounded-l-2xl",
}: {
  title: string;
  description: ReactNode;
  fileName?: string | null;
  footerHint: string;
  /** Match the hosting surface (e.g. drawer content radius). */
  clipClassName?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "absolute inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden px-6",
        clipClassName,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-background/90 backdrop-blur-[3px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-15%,hsl(var(--primary)/0.14),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_45%_35%_at_95%_95%,hsl(var(--primary)/0.1),transparent)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(hsl(var(--muted-foreground)/0.14)_1px,transparent_1px)] [background-size:18px_18px]"
        aria-hidden
      />

      <div className="relative flex max-w-lg flex-col items-center text-center">
        <div className="relative flex size-[9.5rem] items-center justify-center">
          <span
            className="absolute inset-0 animate-[spin_14s_linear_infinite] rounded-full border border-dashed border-primary/30"
            aria-hidden
          />
          <span
            className="absolute inset-3 animate-[spin_10s_linear_infinite_reverse] rounded-full border border-primary/15"
            aria-hidden
          />
          <span
            className="absolute size-24 animate-ping rounded-full bg-primary/15 [animation-duration:2.8s]"
            aria-hidden
          />
          <div className="relative flex size-[4.75rem] items-center justify-center rounded-full bg-gradient-to-br from-primary/25 via-primary/10 to-primary/5 shadow-[0_0_40px_-8px_hsl(var(--primary)/0.45)] ring-1 ring-primary/25">
            <Sparkles
              className="size-[2.1rem] text-primary drop-shadow-sm animate-pulse [animation-duration:2s]"
              aria-hidden
            />
          </div>
        </div>

        <h3 className="mt-10 text-balance text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        {fileName ? (
          <div className="mt-4 flex max-w-full items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-left shadow-sm">
            <FileText className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 truncate font-mono text-xs text-foreground">
              {fileName}
            </span>
          </div>
        ) : null}

        <div className="mt-10 flex items-center gap-2.5 text-sm text-muted-foreground">
          <Loader2
            className="size-4 shrink-0 animate-spin text-primary"
            aria-hidden
          />
          <span>{footerHint}</span>
        </div>
      </div>
    </div>
  );
}
