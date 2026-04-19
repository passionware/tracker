import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ContractorMultiPicker } from "@/features/_common/elements/pickers/ContractorPicker";
import { contractorQueryUtils } from "@/api/contractor/contractor.api";
import type { WithFrontServices } from "@/core/frontServices";
import type { ContractorsSummaryScoped } from "@/features/tmetric-dashboard/tmetric-dashboard.utils";
import { Plus, Trash2, ChevronLeft, Pencil, Check, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CUSTOM_KPI_DISPLAYS,
  CUSTOM_KPI_VARIABLES,
  VARIABLE_DESCRIPTIONS,
  type CustomDashboardKpi,
  type CustomKpiDisplay,
} from "./customKpi.types";
import { validateKpi } from "./customKpiExpression";
import { useCustomKpiValues } from "./useCustomKpiValues";
import { formatKpiValue } from "./customKpiFormat";

const KNOWN_NAMES = new Set(CUSTOM_KPI_VARIABLES);

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `kpi-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function emptyKpi(): CustomDashboardKpi {
  return {
    id: newId(),
    name: "",
    description: "",
    formula: "",
    contractorIds: [],
    display: "currency",
    baseCurrency: "PLN",
  };
}

export function CustomKpiManagerDialog({
  open,
  onOpenChange,
  services,
  contractorsSummary,
  contractorNameMap,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: WithFrontServices["services"];
  contractorsSummary: ContractorsSummaryScoped | null;
  contractorNameMap: Map<number, string>;
}) {
  const kpis = services.preferenceService.useCustomDashboardKpis();
  const [editing, setEditing] = useState<CustomDashboardKpi | null>(null);

  useEffect(() => {
    if (!open) {
      setEditing(null);
    }
  }, [open]);

  const persist = (next: CustomDashboardKpi[]) => {
    void services.preferenceService.setCustomDashboardKpis(next);
  };

  const handleSave = (kpi: CustomDashboardKpi) => {
    const exists = kpis.some((k) => k.id === kpi.id);
    const next = exists
      ? kpis.map((k) => (k.id === kpi.id ? kpi : k))
      : [...kpis, kpi];
    persist(next);
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    persist(kpis.filter((k) => k.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        {editing ? (
          <KpiEditor
            kpi={editing}
            services={services}
            contractorsSummary={contractorsSummary}
            contractorNameMap={contractorNameMap}
            onCancel={() => setEditing(null)}
            onSave={handleSave}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Custom KPIs</DialogTitle>
              <DialogDescription>
                Build dashboard cards from formulas over the current scope.
                Stored locally in your browser.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
              {kpis.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No KPIs yet. Add one to start.
                </p>
              ) : (
                kpis.map((kpi) => (
                  <div
                    key={kpi.id}
                    className="flex min-w-0 items-start justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{kpi.name}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {kpi.display}
                        </Badge>
                        {(kpi.contractorIds?.length ?? 0) > 0 && (
                          <Badge variant="neutral" className="text-[10px]">
                            {kpi.contractorIds!.length} contractor(s)
                          </Badge>
                        )}
                      </div>
                      <code className="block truncate text-xs text-muted-foreground">
                        {kpi.formula}
                      </code>
                      {kpi.description && (
                        <span className="text-xs text-muted-foreground">
                          {kpi.description}
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditing(kpi)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(kpi.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <DialogFooter className="flex-row items-center justify-between sm:justify-between">
              <Button
                variant="outline"
                onClick={() => setEditing(emptyKpi())}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                New KPI
              </Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function KpiEditor({
  kpi: initial,
  services,
  contractorsSummary,
  contractorNameMap: _contractorNameMap,
  onCancel,
  onSave,
}: {
  kpi: CustomDashboardKpi;
  services: WithFrontServices["services"];
  contractorsSummary: ContractorsSummaryScoped | null;
  contractorNameMap: Map<number, string>;
  onCancel: () => void;
  onSave: (kpi: CustomDashboardKpi) => void;
}) {
  const [draft, setDraft] = useState<CustomDashboardKpi>(initial);
  const formulaRef = useRef<HTMLTextAreaElement>(null);

  const validation = useMemo(
    () => validateKpi(draft.formula, KNOWN_NAMES),
    [draft.formula],
  );

  const previewKpis = useMemo(() => [draft], [draft]);
  const previewEvaluation = useCustomKpiValues(
    services,
    previewKpis,
    contractorsSummary,
  )[0];

  const update = (partial: Partial<CustomDashboardKpi>) =>
    setDraft((d) => ({ ...d, ...partial }));

  const insertVariable = (name: string) => {
    const ta = formulaRef.current;
    if (!ta) {
      update({ formula: draft.formula + name });
      return;
    }
    const start = ta.selectionStart ?? draft.formula.length;
    const end = ta.selectionEnd ?? draft.formula.length;
    const next = draft.formula.slice(0, start) + name + draft.formula.slice(end);
    update({ formula: next });
    requestAnimationFrame(() => {
      ta.focus();
      const caret = start + name.length;
      ta.setSelectionRange(caret, caret);
    });
  };

  const canSave =
    draft.name.trim().length > 0 &&
    draft.baseCurrency.trim().length > 0 &&
    validation.ok;

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onCancel}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <DialogTitle>
            {initial.name ? `Edit ${initial.name}` : "New custom KPI"}
          </DialogTitle>
        </div>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto pr-1 md:grid-cols-3">
        <div className="space-y-3 md:col-span-2">
          <div className="space-y-1.5">
            <Label htmlFor="kpi-name">Name</Label>
            <Input
              id="kpi-name"
              value={draft.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="e.g. Effective hourly rate"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kpi-description">Description (optional)</Label>
            <Input
              id="kpi-description"
              value={draft.description ?? ""}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Short hint shown under the value"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kpi-formula">Formula</Label>
            <Textarea
              id="kpi-formula"
              ref={formulaRef}
              value={draft.formula}
              onChange={(e) => update({ formula: e.target.value })}
              placeholder="e.g. totalBilling / totalHours"
              className="font-mono text-sm"
              rows={3}
            />
            {draft.formula.trim().length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Use + - * / and parentheses. Click variables on the right to
                insert them.
              </p>
            ) : validation.ok ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                <span>
                  Preview:{" "}
                  <strong className="font-semibold">
                    {previewEvaluation && previewEvaluation.result.ok
                      ? formatKpiValue(
                          previewEvaluation.result.value,
                          draft.display,
                          draft.baseCurrency,
                        )
                      : "—"}
                  </strong>
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-1.5 text-xs text-destructive">
                <X className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  {validation.error} (at position {validation.position + 1})
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="kpi-display">Display as</Label>
              <Select
                value={draft.display}
                onValueChange={(v) => update({ display: v as CustomKpiDisplay })}
              >
                <SelectTrigger id="kpi-display">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_KPI_DISPLAYS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kpi-currency">Base currency</Label>
              <Input
                id="kpi-currency"
                value={draft.baseCurrency}
                onChange={(e) =>
                  update({ baseCurrency: e.target.value.toUpperCase() })
                }
                placeholder="PLN"
                maxLength={6}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Contractor filter (optional)</Label>
            <ContractorMultiPicker
              services={services}
              size="sm"
              value={draft.contractorIds ?? []}
              onSelect={(ids) =>
                update({
                  contractorIds: ids.filter(
                    (id): id is number => typeof id === "number",
                  ),
                })
              }
              query={contractorQueryUtils.ofEmpty()}
            />
            <p className="text-xs text-muted-foreground">
              When set, the scoped variables ({"{cost, billing, profit, hours, entries}"}) only
              cover the selected contractors. Total variables always cover everyone.
            </p>
          </div>
        </div>

        <div className="space-y-2 md:col-span-1">
          <Label>Variables</Label>
          <div className="rounded-md border bg-muted/30 p-2">
            <ul className="flex flex-col gap-0.5">
              {CUSTOM_KPI_VARIABLES.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => insertVariable(name)}
                    className="group flex w-full flex-col gap-0.5 rounded px-2 py-1.5 text-left hover:bg-accent"
                    title={VARIABLE_DESCRIPTIONS[name]}
                  >
                    <code className="text-xs font-medium text-foreground">
                      {name}
                    </code>
                    <span className="text-[10px] leading-tight text-muted-foreground">
                      {VARIABLE_DESCRIPTIONS[name]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={!canSave} onClick={() => onSave(draft)}>
          Save
        </Button>
      </DialogFooter>
    </>
  );
}
