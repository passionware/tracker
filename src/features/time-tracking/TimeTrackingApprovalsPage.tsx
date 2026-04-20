import {
  contractorQueryUtils,
  type Contractor,
} from "@/api/contractor/contractor.api.ts";
import { projectQueryUtils, type Project } from "@/api/project/project.api.ts";
import type { TimeEntry } from "@/api/time-entry/time-entry.api.ts";
import type {
  TimeRole,
  TimeRoleKind,
} from "@/api/time-role/time-role.api.ts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import {
  buildContractorEnvelope,
  buildTimeApprovedPayload,
  buildTimeRejectedPayload,
  newUuid,
} from "@/features/time-tracking/_common/trackerCommands.ts";
import { formatElapsedSeconds } from "@/features/time-tracking/_common/useElapsedSeconds.ts";
import { cn } from "@/lib/utils.ts";
import type { ClientSpec, WorkspaceSpec } from "@/routing/routingUtils.ts";
import { rd } from "@passionware/monads";
import { format } from "date-fns";
import { Check, ShieldAlert, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * Project admin queue for time-entry approval.
 *
 * Scope is derived from the caller's roles:
 *   - super_admin: every submitted entry in the current schema
 *   - project_admin: entries for `scope_project_id` they admin
 *   - anything else: page renders a read-only "not authorised" state
 *
 * Batched approve/reject emits one contractor-stream event per contractor
 * (the stream is keyed by contractor). A reason is mandatory on reject.
 */
export function TimeTrackingApprovalsPage(
  props: WithFrontServices & {
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  const auth = props.services.authService.useAuth();
  const userId = rd.tryGet(auth)?.id ?? null;
  const rolesRd = props.services.timeRoleService.useMyRoles(userId);

  return (
    <CommonPageContainer
      segments={[
        <WorkspaceBreadcrumbLink
          workspaceId={props.workspaceId}
          services={props.services}
        />,
        <ClientBreadcrumbLink
          clientId={props.clientId}
          services={props.services}
        />,
        <BreadcrumbPage>Time tracking</BreadcrumbPage>,
        <BreadcrumbPage>Approvals</BreadcrumbPage>,
      ]}
    >
      {rd
        .journey(rolesRd)
        .wait(<Skeleton className="h-64 w-full" />)
        .catch(renderError)
        .map((roles) => {
          const scope = deriveAdminScope(roles);
          if (scope.kind === "none" || userId === null) {
            return <NotAuthorisedCard />;
          }
          const adminScope: AdminScope =
            scope.kind === "super_admin"
              ? { kind: "super_admin", projectIds: null }
              : { kind: "project_admin", projectIds: scope.projectIds };
          return (
            <ApprovalsQueue
              services={props.services}
              scope={adminScope}
              approverUserId={userId}
            />
          );
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
        Only <code>super_admin</code> or <code>project_admin</code> roles
        can review submitted time. Ask an admin to grant your account the
        appropriate role in the <code>time.role</code> table.
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

interface AdminScope {
  kind: "super_admin" | "project_admin";
  projectIds: number[] | null;
}

function ApprovalsQueue(
  props: WithFrontServices & {
    scope: AdminScope;
    approverUserId: string;
  },
) {
  const { services, scope, approverUserId } = props;
  const query = useMemo(
    () => ({
      approvalState: "submitted" as const,
      limit: 500,
    }),
    [],
  );
  const entriesRd = services.timeEntryService.useEntries(query);

  const entries = rd.tryGet(entriesRd) ?? [];
  const scopedEntries = useMemo(
    () =>
      scope.projectIds === null
        ? entries
        : entries.filter((e) => scope.projectIds!.includes(e.projectId)),
    [entries, scope.projectIds],
  );

  const contractors = services.contractorService.useContractors(
    useMemo(() => contractorQueryUtils.ofEmpty(), []),
  );
  const projects = services.projectService.useProjects(
    useMemo(() => projectQueryUtils.ofDefault(), []),
  );
  const contractorLookup = useMemo(() => {
    const map = new Map<number, Contractor>();
    const list = rd.tryGet(contractors);
    if (list) for (const c of list) map.set(c.id, c);
    return map;
  }, [contractors]);
  const projectLookup = useMemo(() => {
    const map = new Map<number, Project>();
    const list = rd.tryGet(projects);
    if (list) for (const p of list) map.set(p.id, p);
    return map;
  }, [projects]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleBatch = (ids: string[], all: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (all) for (const id of ids) next.delete(id);
      else for (const id of ids) next.add(id);
      return next;
    });

  // Emit one event per contractor (each stream is keyed by contractorId).
  async function dispatch(kind: "approve" | "reject", reason?: string) {
    if (selected.size === 0) return;
    const byContractor = new Map<number, TimeEntry[]>();
    for (const e of scopedEntries) {
      if (!selected.has(e.id)) continue;
      let bucket = byContractor.get(e.contractorId);
      if (!bucket) {
        bucket = [];
        byContractor.set(e.contractorId, bucket);
      }
      bucket.push(e);
    }
    if (byContractor.size === 0) return;

    setSubmitting(true);
    try {
      const correlationId = newUuid();
      let failures = 0;
      for (const [contractorId, bucket] of byContractor) {
        const envelope = buildContractorEnvelope({
          contractorId,
          correlationId,
        });
        const entryIds = bucket.map((e) => e.id);
        const payload =
          kind === "approve"
            ? buildTimeApprovedPayload(entryIds, approverUserId)
            : buildTimeRejectedPayload(entryIds, approverUserId, reason ?? "");
        const outcome =
          await services.eventQueueService.submitContractorEvent(
            envelope,
            payload,
          );
        if (outcome.kind === "rejected_locally") {
          failures += bucket.length;
          toast.error(
            `${bucket.length} entries for contractor ${contractorId} rejected: ${outcome.errors
              .map((e) => e.message)
              .join("; ")}`,
          );
        }
      }
      const ok = selected.size - failures;
      if (ok > 0) {
        toast.success(
          kind === "approve"
            ? `Approved ${ok} entries across ${byContractor.size} contractors`
            : `Rejected ${ok} entries across ${byContractor.size} contractors`,
        );
      }
      setSelected(new Set());
      setRejectReason("");
      setRejectOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  const groups = useMemo(
    () => groupByContractorAndDay(scopedEntries),
    [scopedEntries],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {scopedEntries.length} submitted · {groups.length} contractor
          {groups.length === 1 ? "" : "s"}
          {scope.kind === "project_admin" && scope.projectIds ? (
            <span className="ml-2">
              · scope:{" "}
              <Badge variant="secondary">
                {scope.projectIds.length} project
                {scope.projectIds.length === 1 ? "" : "s"}
              </Badge>
            </span>
          ) : (
            <Badge variant="secondary" className="ml-2">
              super_admin
            </Badge>
          )}
        </div>
        {selected.size > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {selected.size} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectOpen(true)}
              disabled={submitting}
              className="gap-1.5"
            >
              <X className="size-4" />
              Reject…
            </Button>
            <Button
              size="sm"
              onClick={() => dispatch("approve")}
              disabled={submitting}
              className="gap-1.5"
            >
              <Check className="size-4" />
              {submitting ? "Saving…" : "Approve"}
            </Button>
          </div>
        ) : null}
      </div>

      {rd
        .journey(entriesRd)
        .wait(
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>,
        )
        .catch(renderError)
        .map(() =>
          groups.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Nothing waiting for approval.
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {groups.map((group) => (
                <ContractorGroupCard
                  key={group.contractorId}
                  group={group}
                  contractor={contractorLookup.get(group.contractorId) ?? null}
                  projectLookup={projectLookup}
                  selected={selected}
                  onToggle={toggle}
                  onToggleBatch={toggleBatch}
                />
              ))}
            </div>
          ),
        )}

      <RejectDialog
        open={rejectOpen}
        onOpenChange={(open) => {
          setRejectOpen(open);
          if (!open) setRejectReason("");
        }}
        reason={rejectReason}
        onReasonChange={setRejectReason}
        onConfirm={() => dispatch("reject", rejectReason.trim())}
        submitting={submitting}
        count={selected.size}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reject dialog
// ---------------------------------------------------------------------------

function RejectDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: string;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  submitting: boolean;
  count: number;
}) {
  const disabled = props.submitting || props.reason.trim().length === 0;
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject {props.count} entries</DialogTitle>
          <DialogDescription>
            The reason is mandatory and will be visible to the contractor so
            they can revise and resubmit.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          autoFocus
          rows={4}
          value={props.reason}
          onChange={(e) => props.onReasonChange(e.target.value)}
          placeholder="e.g. Tuesday afternoon needs a task assigned"
        />
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => props.onOpenChange(false)}
            disabled={props.submitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={props.onConfirm}
            disabled={disabled}
            className="gap-1.5"
          >
            <X className="size-4" />
            {props.submitting ? "Rejecting…" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Contractor card
// ---------------------------------------------------------------------------

interface ContractorGroup {
  contractorId: number;
  totalSeconds: number;
  days: DayGroup[];
}
interface DayGroup {
  dayKey: string;
  label: string;
  totalSeconds: number;
  entries: TimeEntry[];
}

function ContractorGroupCard(props: {
  group: ContractorGroup;
  contractor: Contractor | null;
  projectLookup: Map<number, Project>;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleBatch: (ids: string[], all: boolean) => void;
}) {
  const { group, contractor, projectLookup, selected } = props;
  const allIds = useMemo(
    () => group.days.flatMap((d) => d.entries.map((e) => e.id)),
    [group],
  );
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id));
  const anySelected = allIds.some((id) => selected.has(id));

  const displayName =
    contractor?.fullName ??
    contractor?.name ??
    `Contractor #${group.contractorId}`;
  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <CardTitle className="text-sm font-medium truncate">
              {displayName}
            </CardTitle>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatElapsedSeconds(group.totalSeconds)} ·{" "}
              {allIds.length} entries
            </span>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={
              allSelected ? true : anySelected ? "indeterminate" : false
            }
            onCheckedChange={() => props.onToggleBatch(allIds, allSelected)}
          />
          Select all
        </label>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        {group.days.map((day) => (
          <div key={day.dayKey} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between border-b border-border pb-1">
              <h4 className="text-xs font-medium">{day.label}</h4>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {formatElapsedSeconds(day.totalSeconds)}
              </span>
            </div>
            <ul className="flex flex-col divide-y divide-border">
              {day.entries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  project={projectLookup.get(entry.projectId) ?? null}
                  selected={selected.has(entry.id)}
                  onToggle={() => props.onToggle(entry.id)}
                />
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EntryRow(props: {
  entry: TimeEntry;
  project: Project | null;
  selected: boolean;
  onToggle: () => void;
}) {
  const { entry, project } = props;
  const started = entry.startedAt;
  const stopped = entry.stoppedAt;
  const seconds =
    stopped !== null
      ? Math.max(
          0,
          Math.floor((stopped.getTime() - started.getTime()) / 1000),
        )
      : entry.durationSeconds ?? 0;
  return (
    <li
      className={cn(
        "flex items-center gap-3 py-2 -mx-2 px-2 rounded-md hover:bg-muted/50 cursor-pointer",
      )}
      onClick={props.onToggle}
    >
      <Checkbox checked={props.selected} onCheckedChange={props.onToggle} />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-medium truncate">
          {project?.name ?? `Project ${entry.projectId}`}
        </span>
        {entry.description ? (
          <span className="text-xs text-muted-foreground truncate">
            {entry.description}
          </span>
        ) : null}
        <span className="text-[11px] text-muted-foreground">
          {format(started, "HH:mm")}
          {stopped ? ` – ${format(stopped, "HH:mm")}` : null}
        </span>
      </div>
      <span className="font-mono text-sm tabular-nums">
        {formatElapsedSeconds(seconds)}
      </span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Grouping helpers
// ---------------------------------------------------------------------------

function groupByContractorAndDay(entries: TimeEntry[]): ContractorGroup[] {
  const byContractor = new Map<number, Map<string, DayGroup>>();
  const contractorTotals = new Map<number, number>();

  for (const e of entries) {
    let days = byContractor.get(e.contractorId);
    if (!days) {
      days = new Map();
      byContractor.set(e.contractorId, days);
    }
    const dayKey = format(e.startedAt, "yyyy-MM-dd");
    let day = days.get(dayKey);
    if (!day) {
      day = {
        dayKey,
        label: format(e.startedAt, "EEE d MMM"),
        totalSeconds: 0,
        entries: [],
      };
      days.set(dayKey, day);
    }
    const seconds =
      e.stoppedAt !== null
        ? Math.max(
            0,
            Math.floor((e.stoppedAt.getTime() - e.startedAt.getTime()) / 1000),
          )
        : 0;
    day.totalSeconds += seconds;
    day.entries.push(e);
    contractorTotals.set(
      e.contractorId,
      (contractorTotals.get(e.contractorId) ?? 0) + seconds,
    );
  }

  return Array.from(byContractor.entries())
    .map(([contractorId, days]) => ({
      contractorId,
      totalSeconds: contractorTotals.get(contractorId) ?? 0,
      days: Array.from(days.values())
        .map((d) => ({
          ...d,
          entries: d.entries.sort(
            (a, b) => a.startedAt.getTime() - b.startedAt.getTime(),
          ),
        }))
        .sort((a, b) => (a.dayKey < b.dayKey ? 1 : -1)),
    }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds);
}

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------

export function deriveAdminScope(roles: TimeRole[]): {
  kind: "none" | "super_admin" | "project_admin";
  projectIds: number[] | null;
} {
  const kinds = new Set<TimeRoleKind>(roles.map((r) => r.role));
  if (kinds.has("super_admin")) {
    return { kind: "super_admin", projectIds: null };
  }
  const projectIds = roles
    .filter((r) => r.role === "project_admin" && r.scopeProjectId !== null)
    .map((r) => r.scopeProjectId!) as number[];
  if (projectIds.length > 0) {
    return { kind: "project_admin", projectIds };
  }
  return { kind: "none", projectIds: null };
}
