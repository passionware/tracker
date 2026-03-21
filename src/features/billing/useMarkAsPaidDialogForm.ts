import { dateToCalendarDate } from "@/platform/lang/internationalized-date";
import type { CalendarDate } from "@internationalized/date";
import { useCallback, useEffect, useState } from "react";

export type MarkAsPaidConfirmPayload = {
  paidAt: CalendarDate;
  paidAtJustification: string | null;
};

export function useMarkAsPaidDialogForm({
  open,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  onConfirm: (data: MarkAsPaidConfirmPayload) => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [paidAt, setPaidAt] = useState<CalendarDate | null>(() =>
    dateToCalendarDate(new Date()),
  );
  const [justification, setJustification] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPaidAt(dateToCalendarDate(new Date()));
      setJustification("");
    }
  }, [open]);

  const submit = useCallback(async () => {
    if (!paidAt) return;
    setBusy(true);
    try {
      await onConfirm({
        paidAt,
        paidAtJustification: justification.trim() || null,
      });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }, [justification, onConfirm, onOpenChange, paidAt]);

  return {
    paidAt,
    setPaidAt,
    justification,
    setJustification,
    busy,
    submit,
  };
}
