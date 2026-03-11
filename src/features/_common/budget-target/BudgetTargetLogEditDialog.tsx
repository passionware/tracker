import type { BudgetTargetLogEntry } from "@/api/iteration-trigger/iteration-trigger.api";
import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api";
import { Button } from "@/components/ui/button";
import type { GenericReport } from "@/services/io/_common/GenericReport";
import { calendarDateToJSDate } from "@/platform/lang/internationalized-date";
import { getCumulativeBillingByDay } from "@/features/tmetric-dashboard/tmetric-dashboard.utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WithFrontServices } from "@/core/frontServices";
import { format } from "date-fns";
import { Loader2, Pencil, Plus, RotateCcw, Trash2, History } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

export interface BudgetTargetLogEditDialogProps extends WithFrontServices {
  entries: BudgetTargetLogEntry[];
  iteration: ProjectIteration;
  /** When set, show "Regenerate from TMetric". Called with iteration to fetch report for full iteration range, then backfills missing daily snapshots. */
  fetchReportForIterationRange?: (
    iteration: ProjectIteration,
  ) => Promise<{ reportData: GenericReport; rateMap: Map<string, number> } | null>;
}

/** Format for datetime-local input: yyyy-MM-ddTHH:mm */
function toDateTimeLocal(d: Date): string {
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

function parseDateTimeLocal(s: string): Date | null {
  const t = s.trim();
  if (t === "") return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

type RowState = {
  id: number | string;
  createdAt: string;
  newTargetAmount: string;
  billingSnapshotAmount: string;
  isNew?: boolean;
  /** Existing rows only: mark for deletion on Save */
  markedForDelete?: boolean;
};

function toRowState(e: BudgetTargetLogEntry): RowState {
  return {
    id: e.id,
    createdAt: toDateTimeLocal(e.createdAt),
    newTargetAmount:
      e.newTargetAmount != null ? String(e.newTargetAmount) : "",
    billingSnapshotAmount:
      e.billingSnapshotAmount != null ? String(e.billingSnapshotAmount) : "",
  };
}

function newEmptyRow(): RowState {
  return {
    id: `new-${Date.now()}`,
    createdAt: toDateTimeLocal(new Date()),
    newTargetAmount: "",
    billingSnapshotAmount: "",
    isNew: true,
  };
}

function parseNum(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isNaN(n) ? null : n;
}

export function BudgetTargetLogEditDialog({
  entries,
  iteration,
  services,
  fetchReportForIterationRange,
}: BudgetTargetLogEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<RowState[]>(() => entries.map(toRowState));
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const currency = iteration.currency;
  const iterationId = iteration.id;

  const syncFromEntries = useCallback(() => {
    setRows(entries.map(toRowState));
  }, [entries]);

  const openChange = useCallback(
    (next: boolean) => {
      if (next) syncFromEntries();
      setOpen(next);
    },
    [syncFromEntries],
  );

  const entryById = useMemo(
    () => new Map(entries.map((e) => [e.id, e])),
    [entries],
  );

  const dirtyExisting = useMemo(() => {
    return rows
      .filter(
        (r): r is RowState & { id: number } =>
          typeof r.id === "number" && !r.markedForDelete,
      )
      .map((r) => {
        const orig = entryById.get(r.id);
        if (!orig) return null;
        const target = parseNum(r.newTargetAmount);
        const billing = parseNum(r.billingSnapshotAmount);
        const created = parseDateTimeLocal(r.createdAt);
        const targetChanged = (orig.newTargetAmount ?? null) !== target;
        const billingChanged =
          (orig.billingSnapshotAmount ?? null) !== billing;
        const dateChanged =
          created != null && created.getTime() !== orig.createdAt.getTime();
        if (!targetChanged && !billingChanged && !dateChanged) return null;
        return {
          id: r.id,
          createdAt: created ?? orig.createdAt,
          newTargetAmount: target,
          billingSnapshotAmount: billing,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  }, [rows, entryById]);

  const rowsToDelete = useMemo(
    () =>
      rows.filter(
        (r): r is RowState & { id: number } =>
          typeof r.id === "number" && r.markedForDelete === true,
      ),
    [rows],
  );

  const newRows = useMemo(
    () => rows.filter((r) => r.isNew === true),
    [rows],
  );

  const updateRow = useCallback(
    (
      id: number | string,
      field: "createdAt" | "newTargetAmount" | "billingSnapshotAmount",
      value: string,
    ) => {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
      );
    },
    [],
  );

  const toggleMarkForDelete = useCallback((row: RowState) => {
    if (row.isNew) {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      return;
    }
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, markedForDelete: !r.markedForDelete }
          : r,
      ),
    );
  }, []);

  const handleAddRow = useCallback(() => {
    setRows((prev) => [...prev, newEmptyRow()]);
  }, []);

  const handleRegenerateFromTmetric = useCallback(async () => {
    if (!fetchReportForIterationRange) return;
    setRegenerating(true);
    try {
      const result = await fetchReportForIterationRange(iteration);
      if (!result) return;
      const periodStart = calendarDateToJSDate(iteration.periodStart);
      const periodEnd = calendarDateToJSDate(iteration.periodEnd);
      const byDay = getCumulativeBillingByDay(
        result.reportData,
        iteration.id,
        periodStart,
        periodEnd,
        iteration.currency,
        result.rateMap,
      );
      const existingDayKeys = new Set(
        entries.map((e) => format(e.createdAt, "yyyy-MM-dd")),
      );
      for (const { date, cumulativeBilling } of byDay) {
        const dayKey = format(date, "yyyy-MM-dd");
        if (existingDayKeys.has(dayKey)) continue;
        await services.mutationService.insertBudgetTargetLogEntry(
          iteration.id,
          {
            createdAt: date,
            newTargetAmount: null,
            billingSnapshotAmount: cumulativeBilling,
            billingSnapshotCurrency: iteration.currency,
          },
        );
        existingDayKeys.add(dayKey);
      }
      setOpen(false);
    } finally {
      setRegenerating(false);
    }
  }, [fetchReportForIterationRange, iteration, entries, services.mutationService]);

  const handleSave = useCallback(async () => {
    const hasUpdates =
      dirtyExisting.length > 0 ||
      newRows.length > 0 ||
      rowsToDelete.length > 0;
    if (!hasUpdates) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      for (const row of dirtyExisting) {
        await services.mutationService.updateBudgetTargetLogEntry(row.id, {
          createdAt: row.createdAt,
          newTargetAmount: row.newTargetAmount ?? null,
          billingSnapshotAmount: row.billingSnapshotAmount ?? null,
          billingSnapshotCurrency: currency,
        });
      }
      for (const row of newRows) {
        const created = parseDateTimeLocal(row.createdAt);
        await services.mutationService.insertBudgetTargetLogEntry(
          iterationId,
          {
            createdAt: created ?? new Date(),
            newTargetAmount: parseNum(row.newTargetAmount) ?? null,
            billingSnapshotAmount:
              parseNum(row.billingSnapshotAmount) ?? null,
            billingSnapshotCurrency: currency,
          },
        );
      }
      for (const row of rowsToDelete) {
        await services.mutationService.deleteBudgetTargetLogEntry(row.id);
      }
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }, [
    dirtyExisting,
    newRows,
    rowsToDelete,
    services.mutationService,
    currency,
    iterationId,
  ]);

  const allRowsValid = useMemo(() => {
    const check = (r: RowState) => {
      const target = parseNum(r.newTargetAmount);
      const billing = parseNum(r.billingSnapshotAmount);
      if (target != null && target < 0) return false;
      if (billing != null && billing < 0) return false;
      if (r.isNew && (r.newTargetAmount.trim() === "") && (r.billingSnapshotAmount.trim() === ""))
        return true;
      return true;
    };
    return rows.every(check);
  }, [rows]);

  const canSave =
    allRowsValid &&
    (dirtyExisting.length > 0 ||
      newRows.length > 0 ||
      rowsToDelete.length > 0) &&
    (dirtyExisting.every(
      (d) =>
        (d.newTargetAmount == null || d.newTargetAmount >= 0) &&
        (d.billingSnapshotAmount == null || d.billingSnapshotAmount >= 0),
    ) &&
      newRows.every((r) => {
        const t = parseNum(r.newTargetAmount);
        const b = parseNum(r.billingSnapshotAmount);
        return (t == null || t >= 0) && (b == null || b >= 0);
      }));

  const saveLabel = useMemo(() => {
    const n =
      dirtyExisting.length + newRows.length + rowsToDelete.length;
    return n > 0 ? `Save (${n})` : "Save";
  }, [dirtyExisting.length, newRows.length, rowsToDelete.length]);

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Pencil className="h-3.5 w-3.5" />
          Edit history
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit budget target history</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto min-h-0 -mx-1 px-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Date</TableHead>
                <TableHead>Target ({currency})</TableHead>
                <TableHead>Billing snapshot ({currency})</TableHead>
                <TableHead className="w-[72px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const marked = r.markedForDelete === true;
                return (
                  <TableRow
                    key={r.id}
                    className={marked ? "opacity-60 bg-muted/30" : undefined}
                  >
                    <TableCell>
                      <Input
                        type="datetime-local"
                        className="h-8 text-xs font-mono"
                        value={r.createdAt}
                        onChange={(e) =>
                          updateRow(r.id, "createdAt", e.target.value)
                        }
                        disabled={marked}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="—"
                        className="h-8 text-xs"
                        value={r.newTargetAmount}
                        onChange={(e) =>
                          updateRow(r.id, "newTargetAmount", e.target.value)
                        }
                        disabled={marked}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="—"
                        className="h-8 text-xs"
                        value={r.billingSnapshotAmount}
                        onChange={(e) =>
                          updateRow(
                            r.id,
                            "billingSnapshotAmount",
                            e.target.value,
                          )
                        }
                        disabled={marked}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={
                          marked
                            ? "h-8 w-8 text-muted-foreground hover:text-foreground"
                            : "h-8 w-8 text-muted-foreground hover:text-destructive"
                        }
                        onClick={() => toggleMarkForDelete(r)}
                        title={
                          r.isNew
                            ? "Remove new row"
                            : marked
                              ? "Restore (undo delete)"
                              : "Mark for deletion"
                        }
                      >
                        {marked ? (
                          <RotateCcw className="h-4 w-4" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRow}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add row
            </Button>
            {fetchReportForIterationRange && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRegenerateFromTmetric}
                disabled={regenerating}
                className="gap-1.5"
                title="Fetch TMetric for full iteration period and insert missing daily billing snapshots"
              >
                {regenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <History className="h-3.5 w-3.5" />
                )}
                Regenerate from TMetric
              </Button>
            )}
          </div>
          <DialogFooter className="p-0">
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={!canSave || saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                saveLabel
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
