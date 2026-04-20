import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import { projectQueryUtils } from "@/api/project/project.api.ts";
import type { ProjectRate } from "@/api/rate/rate.api.ts";
import type { RateDefinition } from "@/api/time-event/time-event.api.ts";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import {
  buildProjectEnvelope,
  buildRateSetPayload,
  buildRateUnsetPayload,
} from "@/features/time-tracking/_common/projectCommands.ts";
import { newUuid } from "@/features/time-tracking/_common/trackerCommands.ts";
import { deriveAdminScope } from "@/features/time-tracking/TimeTrackingApprovalsPage.tsx";
import { rd } from "@passionware/monads";
import { Pencil, ShieldAlert, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * Admin-only editor for project rates (`RateSet` / `RateUnset` events on
 * the project stream). Pick a project, see every contractor with their
 * current rate, and create or retire rates without leaving the app.
 *
 * Why this page exists:
 *   - Until now `rate_current` could only be populated by appending events
 *     via SQL. The tracker (and the TMetric backfill) needed a rate
 *     snapshot for any non-placeholder entry, which made onboarding a new
 *     (project, contractor) pair hostile.
 *   - The UI mirrors the reducer rules verbatim: one active rate aggregate
 *     per contractor; updates must be strictly later than the current
 *     `effectiveFrom`; retiring creates a `RateUnset` so a later `RateSet`
 *     can open a new aggregate cleanly.
 */
export function ProjectRatesManageWidget(props: WithFrontServices) {
  const auth = props.services.authService.useAuth();
  const userId = rd.tryGet(auth)?.id ?? null;
  const rolesRd = props.services.timeRoleService.useMyRoles(userId);

  return (
    <CommonPageContainer
      segments={[
        <BreadcrumbPage>Configuration</BreadcrumbPage>,
        <BreadcrumbPage>Project rates</BreadcrumbPage>,
      ]}
    >
      {rd
        .journey(rolesRd)
        .wait(<Skeleton className="h-64 w-full" />)
        .catch(renderError)
        .map((roles) => {
          const scope = deriveAdminScope(roles);
          if (scope.kind !== "super_admin" || userId === null) {
            return <NotAuthorisedCard />;
          }
          return <RatesPanel services={props.services} />;
        })}
    </CommonPageContainer>
  );
}

function NotAuthorisedCard() {
  return (
    <Card className="max-w-xl">
      <CardHeader className="flex flex-row items-center gap-2">
        <ShieldAlert className="size-5 text-amber-600" />
        <CardTitle>Not authorised</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Only <code>super_admin</code> accounts can manage project rates.
      </CardContent>
    </Card>
  );
}

function RatesPanel(props: WithFrontServices) {
  const [projectId, setProjectId] = useState<string>("");
  const projectsRd = props.services.projectService.useProjects(
    projectQueryUtils.ofDefault(),
  );
  const contractorsRd = props.services.contractorService.useContractors(
    contractorQueryUtils.ofEmpty(),
  );
  const ratesRd = props.services.projectRateService.useRatesForProject(
    parseIntOrNull(projectId),
  );

  const [editingContractorId, setEditingContractorId] = useState<number | null>(
    null,
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project rates</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="max-w-md">
            <Label>Project</Label>
            {rd
              .journey(projectsRd)
              .wait(<Skeleton className="h-9 w-full" />)
              .catch(renderError)
              .map((projects) => (
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
          </div>
        </CardContent>
      </Card>

      {parseIntOrNull(projectId) !== null ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Contractors on this project
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {rd
              .journey(rd.combine({ contractors: contractorsRd, rates: ratesRd }))
              .wait(<Skeleton className="m-4 h-48 w-full" />)
              .catch(renderError)
              .map(({ contractors, rates }) => (
                <RatesTable
                  contractors={contractors}
                  rates={rates}
                  onEdit={(cid) => setEditingContractorId(cid)}
                  services={props.services}
                  projectId={Number(projectId)}
                />
              ))}
          </CardContent>
        </Card>
      ) : null}

      {editingContractorId !== null && parseIntOrNull(projectId) !== null ? (
        <RateEditorDialog
          services={props.services}
          projectId={Number(projectId)}
          contractorId={editingContractorId}
          current={rd.tryGet(ratesRd)?.find(
            (r) => r.contractorId === editingContractorId,
          ) ?? null}
          onClose={() => setEditingContractorId(null)}
        />
      ) : null}
    </div>
  );
}

interface RatesTableProps
  extends WithFrontServices {
  contractors: { id: number; fullName: string; name: string }[];
  rates: ProjectRate[];
  projectId: number;
  onEdit: (contractorId: number) => void;
}

function RatesTable(props: RatesTableProps) {
  const ratesByContractor = useMemo(() => {
    const m = new Map<number, ProjectRate>();
    for (const r of props.rates) m.set(r.contractorId, r);
    return m;
  }, [props.rates]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40%]">Contractor</TableHead>
          <TableHead className="w-[30%]">Unit price</TableHead>
          <TableHead className="w-[20%]">Effective from</TableHead>
          <TableHead className="w-[10%] text-right" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.contractors.map((c) => {
          const rate = ratesByContractor.get(c.id) ?? null;
          return (
            <TableRow key={c.id}>
              <TableCell className="font-medium">
                <div>{c.fullName}</div>
                <div className="text-xs text-muted-foreground">{c.name}</div>
              </TableCell>
              {rate ? (
                <>
                  <TableCell>
                    {rate.rate.unitPrice} {rate.rate.currency}/{rate.rate.unit}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(rate.effectiveFrom)}
                  </TableCell>
                </>
              ) : (
                <TableCell colSpan={2} className="text-sm text-muted-foreground">
                  — no active rate —
                </TableCell>
              )}
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => props.onEdit(c.id)}
                >
                  <Pencil className="size-3.5" />
                  {rate ? "Edit" : "Set"}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
        {props.contractors.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={4}
              className="py-8 text-center text-sm text-muted-foreground"
            >
              No contractors yet.
            </TableCell>
          </TableRow>
        ) : null}
      </TableBody>
    </Table>
  );
}

interface RateEditorDialogProps extends WithFrontServices {
  projectId: number;
  contractorId: number;
  current: ProjectRate | null;
  onClose: () => void;
}

function RateEditorDialog(props: RateEditorDialogProps) {
  const isUpdate = props.current !== null;
  const seed = props.current?.rate;

  const [unit, setUnit] = useState(seed?.unit ?? "h");
  const [unitPrice, setUnitPrice] = useState(String(seed?.unitPrice ?? ""));
  const [currency, setCurrency] = useState(seed?.currency ?? "PLN");
  const [effectiveFrom, setEffectiveFrom] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const rate: RateDefinition = {
        unit: unit.trim(),
        unitPrice: Number(unitPrice),
        currency: currency.trim().toUpperCase(),
      };
      const { payload, rateAggregateId } = buildRateSetPayload({
        rateAggregateId: props.current?.rateAggregateId,
        contractorId: props.contractorId,
        effectiveFrom,
        rate,
      });
      const envelope = buildProjectEnvelope({
        projectId: props.projectId,
        correlationId: newUuid(),
        aggregateKind: "rate",
        aggregateId: rateAggregateId,
        // For updates we could bump `expectedAggregateVersion`, but the
        // reducer already guards against concurrent changes via the
        // "effectiveFrom must be strictly after current" rule — leaving
        // the token off lets two admins race without one getting a 409.
      });
      const outcome =
        await props.services.eventQueueService.submitProjectEvent(
          envelope,
          payload,
        );
      if (outcome.kind === "rejected_locally") {
        toast.error(
          `Couldn't save rate: ${outcome.errors.map((e) => e.message).join("; ")}`,
        );
        return;
      }
      toast.success(isUpdate ? "Rate updated" : "Rate set");
      props.onClose();
    } catch (e) {
      toast.error(
        `Couldn't save rate: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const retire = async () => {
    if (!props.current) return;
    setBusy(true);
    try {
      const payload = buildRateUnsetPayload(
        props.current.rateAggregateId,
        effectiveFrom,
      );
      const envelope = buildProjectEnvelope({
        projectId: props.projectId,
        correlationId: newUuid(),
        aggregateKind: "rate",
        aggregateId: props.current.rateAggregateId,
      });
      const outcome =
        await props.services.eventQueueService.submitProjectEvent(
          envelope,
          payload,
        );
      if (outcome.kind === "rejected_locally") {
        toast.error(
          `Couldn't retire rate: ${outcome.errors.map((e) => e.message).join("; ")}`,
        );
        return;
      }
      toast.success("Rate retired");
      props.onClose();
    } catch (e) {
      toast.error(
        `Couldn't retire rate: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    unit.trim().length > 0 &&
    Number(unitPrice) >= 0 &&
    Number.isFinite(Number(unitPrice)) &&
    /^[A-Z]{3}$/.test(currency.trim().toUpperCase()) &&
    /^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom);

  return (
    <Dialog open onOpenChange={(open) => (!open ? props.onClose() : undefined)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isUpdate ? "Update rate" : "Set rate"}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? `Emits RateSet on the same aggregate. Effective from must be strictly after ${formatDate(props.current!.effectiveFrom)}.`
              : "Emits RateSet on a fresh aggregate for this contractor."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Unit</Label>
            <Input
              placeholder="h"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Effective from</Label>
            <Input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Unit price</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Currency</Label>
            <Input
              placeholder="PLN"
              value={currency}
              maxLength={3}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Time tracking records only the per-unit price you pay the contractor.
          Downstream billing (reports, invoicing) handles cost-to-bill
          conversion and FX separately.
        </p>
        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {isUpdate ? (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-destructive hover:text-destructive"
                onClick={retire}
                disabled={busy}
              >
                <XCircle className="size-4" />
                Retire rate
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={props.onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!canSubmit || busy}>
              {isUpdate ? "Save" : "Set rate"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function parseIntOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0, 10);
}
