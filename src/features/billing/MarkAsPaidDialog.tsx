import { Button } from "@/components/ui/button.tsx";
import { DatePicker } from "@/components/ui/date-picker.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  type MarkAsPaidConfirmPayload,
  useMarkAsPaidDialogForm,
} from "./useMarkAsPaidDialogForm.ts";

export interface MarkAsPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  /** When true, subtitle explains multiple billings share the same paid date. */
  bulk?: boolean;
  onConfirm: (data: MarkAsPaidConfirmPayload) => void | Promise<void>;
}

export function MarkAsPaidDialog({
  open,
  onOpenChange,
  title = "Mark as paid",
  bulk = false,
  onConfirm,
}: MarkAsPaidDialogProps) {
  const { paidAt, setPaidAt, justification, setJustification, busy, submit } =
    useMarkAsPaidDialogForm({ open, onConfirm, onOpenChange });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-vaul-no-drag>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {bulk ? (
            <p className="text-sm text-muted-foreground">
              The same payment date and note will apply to all selected
              invoices.
            </p>
          ) : null}
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Paid date</Label>
            <DatePicker
              value={paidAt}
              onChange={(d) => setPaidAt(d ?? null)}
              placeholder="Payment date"
            />
          </div>
          <div className="grid gap-2">
            <Label>Note (optional)</Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="e.g. partial payment, wrong amount, installment 1/2…"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || !paidAt}
            onClick={() => void submit()}
          >
            {busy ? "Saving…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
