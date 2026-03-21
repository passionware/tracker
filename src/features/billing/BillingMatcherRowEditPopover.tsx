import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { DatePicker } from "@/components/ui/date-picker.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import type { BillingMatcherDraftMatch } from "@/features/billing/billingMatcher.types.ts";
import { paymentLagHint } from "@/features/billing/billingMatcherUtils.ts";
import { BillingViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import type { CalendarDate } from "@internationalized/date";
import { Pencil, Receipt } from "lucide-react";
import type { ReactNode } from "react";

export function MatcherDateField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

export function ExistingPaidHint({
  entry,
  suggestedPaidAt,
  formatDate,
}: {
  entry: BillingViewEntry | undefined;
  suggestedPaidAt: CalendarDate;
  formatDate: (d: CalendarDate) => string;
}) {
  const existing = entry?.paidAt ?? null;
  if (existing == null) {
    return null;
  }
  const same = existing.toString() === suggestedPaidAt.toString();
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      <Badge tone="outline" variant="secondary" className="font-normal text-xs">
        Recorded paid {formatDate(existing)}
      </Badge>
      <Badge
        tone="solid"
        variant={same ? "positive" : "destructive"}
        className="font-normal text-xs"
      >
        {same ? "Same as suggestion" : "Differs from suggestion"}
      </Badge>
    </div>
  );
}

export function BillingMatcherRowEditPopover({
  row,
  billing,
  onPatch,
  unmatchedPaymentHints,
}: {
  row: BillingMatcherDraftMatch;
  billing: BillingViewEntry | undefined;
  onPatch: (
    patch: Partial<Pick<BillingMatcherDraftMatch, "paidAt" | "justification">>,
  ) => void;
  /** Bank lines the model could not tie to an invoice — e.g. split payments, extra context. */
  unmatchedPaymentHints: string[];
}) {
  const lagHint =
    billing != null ? paymentLagHint(billing.invoiceDate, row.paidAt) : null;
  return (
    <Popover modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-1.5 text-xs text-muted-foreground hover:text-foreground"
          data-no-row-open
        >
          <Pencil className="size-3.5 shrink-0" aria-hidden />
          Edit
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex w-[min(100vw-2rem,28rem)] max-h-[min(90vh,40rem)] flex-col gap-4 overflow-y-auto p-4"
        align="end"
        side="left"
        sideOffset={6}
      >
        <p className="shrink-0 text-sm font-semibold leading-none text-foreground">
          Edit match
        </p>

        <div className="min-w-0 space-y-2">
          <div className="flex items-start gap-2">
            <Receipt
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <div className="min-w-0 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Unmatched payment hints
              </p>
              <p className="text-xs leading-snug text-muted-foreground">
                Text from your bank file the model could not match to a selected
                invoice — useful for split payments, combined amounts, or copying
                into your note.
              </p>
            </div>
          </div>
          {unmatchedPaymentHints.length > 0 ? (
            <ul className="max-h-[14rem] space-y-2 overflow-y-auto rounded-lg border border-border/60 bg-muted/15 px-3 py-2.5">
              {unmatchedPaymentHints.map((h, i) => (
                <li
                  key={`${i}-${h.slice(0, 32)}`}
                  className="break-words text-xs leading-relaxed text-foreground"
                >
                  {h}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
              No hints for this run — the model did not report extra bank lines,
              or the list is empty.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Payment date
          </Label>
          <DatePicker
            value={row.paidAt}
            onChange={(d) => {
              if (!d) return;
              onPatch({ paidAt: d });
            }}
            placeholder="Date"
          />
          {lagHint ? (
            <p className="text-xs leading-snug text-muted-foreground">
              {lagHint}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Note
          </Label>
          <Textarea
            className="min-h-[6.5rem] w-full resize-y text-sm leading-relaxed"
            value={row.justification}
            data-no-row-open
            onChange={(e) => onPatch({ justification: e.target.value })}
            placeholder="Optional note for this match…"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
