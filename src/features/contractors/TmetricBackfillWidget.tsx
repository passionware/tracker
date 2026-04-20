import { CalendarDate, parseDate } from "@internationalized/date";

import { clientQueryUtils } from "@/api/clients/clients.api.ts";
import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import { projectQueryUtils } from "@/api/project/project.api.ts";
import { workspaceQueryUtils } from "@/api/workspace/workspace.api.ts";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
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
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import {
  buildContractorEnvelope,
  buildEntryImportedFromTmetricPayload,
  newUuid,
} from "@/features/time-tracking/_common/trackerCommands.ts";
import {
  buildProjectEnvelope,
  buildTaskCreatedPayload,
} from "@/features/time-tracking/_common/projectCommands.ts";
import { deriveAdminScope } from "@/features/time-tracking/TimeTrackingApprovalsPage.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import type { ProjectRate } from "@/api/rate/rate.api.ts";
import type { RateSnapshot } from "@/api/time-event/time-event.api.ts";
import type { TaskDefinition } from "@/api/task-definition/task-definition.api.ts";
import { createTMetricClient } from "@/services/io/ReportGenerationService/plugins/tmetric/_private/TmetricClient.ts";
import type {
  TMetricAuthConfig,
  TMetricTimeEntry,
} from "@/services/io/ReportGenerationService/plugins/tmetric/_private/TmetricSchemas.ts";
import { rd, type RemoteData } from "@passionware/monads";
import {
  CheckCircle2,
  Download,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * Admin-only page that pulls a contractor's TMetric time entries for a date
 * window and replays them as `EntryImportedFromTmetric` events on their
 * contractor stream. The reducer dedupes by `tmetricEntryId`, so re-running
 * the same window is safe; the worker (or the event queue pre-flight, if a
 * snapshot is supplied) rejects duplicates with a clear error code.
 *
 * Scope for the first version:
 *   - One contractor + client + workspace + target project per run.
 *   - TMetric `task.name` (usually a git branch) is used as a natural
 *     identifier: existing project tasks are matched case-insensitively
 *     by trimmed name; unknown names spawn a fresh `TaskCreated` event
 *     so rerunning the same window is stable across attempts.
 *   - Entries stay `isPlaceholder: true` — activity routing is not yet
 *     part of the backfill; admins can flip them to final via the entry
 *     editor once imported.
 *   - Rate snapshot is read from `rate_current` for the chosen
 *     (project, contractor) pair; if no rate is set we surface a clear
 *     blocker instead of silently importing at zero.
 *
 * The page is gated client-side on `super_admin` and relies on the
 * existing admin plumbing (sidebar + configuration layout).
 */
export function TmetricBackfillWidget(props: WithFrontServices) {
  const auth = props.services.authService.useAuth();
  const userId = rd.tryGet(auth)?.id ?? null;
  const rolesRd = props.services.timeRoleService.useMyRoles(userId);

  return (
    <CommonPageContainer
      segments={[
        <BreadcrumbPage>Configuration</BreadcrumbPage>,
        <BreadcrumbPage>TMetric backfill</BreadcrumbPage>,
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
          return <BackfillPanel services={props.services} />;
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
        Only <code>super_admin</code> accounts can run backfills. Ask an
        admin to grant your account a <code>super_admin</code> grant in the{" "}
        <code>role</code> table.
      </CardContent>
    </Card>
  );
}

type RowStatus =
  | { kind: "pending" }
  | { kind: "queued" }
  | { kind: "duplicate"; reason: string }
  | { kind: "rejected"; reason: string };

interface ImportRow {
  tmetricId: number;
  startedAt: string;
  stoppedAt: string;
  description: string | null;
  taskName: string | null;
  status: RowStatus;
}

interface TaskResolutionRow {
  name: string;
  taskId: string;
  status: "reused" | "created" | "failed";
  reason?: string;
}

function BackfillPanel(props: WithFrontServices) {
  // Form state. Kept as raw strings where the HTML inputs drive it so the
  // user's intermediate edits (e.g. clearing a field) don't force us into
  // an impossible "Maybe<number>" dance.
  const [contractorId, setContractorId] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [taskRows, setTaskRows] = useState<TaskResolutionRow[]>([]);
  const [busy, setBusy] = useState<
    "idle" | "fetching" | "resolving_tasks" | "importing"
  >("idle");
  const [blocker, setBlocker] = useState<string | null>(null);

  // Reference data for the pickers.
  const contractorsRd = props.services.contractorService.useContractors(
    contractorQueryUtils.ofEmpty(),
  );
  const clientsRd = props.services.clientService.useClients(
    clientQueryUtils.ofDefault(),
  );
  const workspacesRd = props.services.workspaceService.useWorkspaces(
    workspaceQueryUtils.ofDefault(),
  );
  const projectsRd = props.services.projectService.useProjects(
    projectQueryUtils.ofDefault(),
  );

  const contractorIdNum = parseIntOrNull(contractorId);
  const projectIdNum = parseIntOrNull(projectId);
  const rateRd = props.services.projectRateService.useCurrentRate(
    projectIdNum,
    contractorIdNum,
  );
  // Existing tasks on the target project — drives the "reuse vs create"
  // decision for each TMetric task name we encounter. Before a project is
  // picked we query with a sentinel `projectId: 0` which no real row has,
  // so the API returns `[]` and the hook settles into an empty success.
  const tasksRd = props.services.taskDefinitionService.useTasks({
    projectId: projectIdNum ?? 0,
    includeArchived: true,
    includeCompleted: true,
    limit: 1000,
  });

  const canSubmit =
    contractorIdNum !== null &&
    parseIntOrNull(clientId) !== null &&
    parseIntOrNull(workspaceId) !== null &&
    parseIntOrNull(projectId) !== null &&
    startDate.length === 10 &&
    endDate.length === 10 &&
    busy === "idle";

  const runBackfill = async () => {
    setBlocker(null);
    setRows([]);
    setTaskRows([]);

    const resolvedContractorId = parseIntOrNull(contractorId);
    const resolvedClientId = parseIntOrNull(clientId);
    const resolvedWorkspaceId = parseIntOrNull(workspaceId);
    const resolvedProjectId = parseIntOrNull(projectId);

    if (
      resolvedContractorId === null ||
      resolvedClientId === null ||
      resolvedWorkspaceId === null ||
      resolvedProjectId === null
    ) {
      setBlocker("Pick contractor, client, workspace, and project.");
      return;
    }

    const rate = rd.tryGet(rateRd);
    if (rate === undefined) {
      setBlocker("Rate is still loading — try again in a moment.");
      return;
    }
    if (rate === null) {
      setBlocker(
        "No active rate for this contractor on the selected project. Set a rate first, then rerun the backfill.",
      );
      return;
    }

    let periodStart: CalendarDate;
    let periodEnd: CalendarDate;
    try {
      periodStart = parseDate(startDate);
      periodEnd = parseDate(endDate);
    } catch {
      setBlocker("Dates must be valid YYYY-MM-DD.");
      return;
    }

    setBusy("fetching");
    let entries: TMetricTimeEntry[] = [];
    try {
      const config = await resolveTmetricConfig(props.services, {
        clientId: resolvedClientId,
        workspaceId: resolvedWorkspaceId,
        contractorId: resolvedContractorId,
      });
      const client = createTMetricClient(config);
      const raw = await client.listTimeEntries({
        periodStart,
        periodEnd,
        userIds: String(
          await props.services.expressionService.ensureExpressionValue(
            {
              clientId: resolvedClientId,
              workspaceId: resolvedWorkspaceId,
              contractorId: resolvedContractorId,
            },
            `vars.tmetric_user`,
            {},
          ),
        ).split(","),
        projectIds: [],
      });
      // Skip running timers — we only import stopped entries. TMetric
      // returns `endTime: null` for live timers; importing one would
      // freeze it at the snapshot moment and never re-sync, which is
      // almost certainly not what the admin wants.
      entries = raw.filter((e) => e.endTime !== null);
    } catch (e) {
      setBlocker(
        `Couldn't fetch from TMetric: ${e instanceof Error ? e.message : String(e)}`,
      );
      setBusy("idle");
      return;
    }

    if (entries.length === 0) {
      setBlocker("TMetric returned 0 entries for that window.");
      setBusy("idle");
      return;
    }

    const rateSnapshot: RateSnapshot = rate.rate;
    const pendingRows: ImportRow[] = entries.map((e) => ({
      tmetricId: e.id,
      startedAt: e.startTime,
      stoppedAt: e.endTime ?? e.startTime,
      description: e.note ?? null,
      taskName: e.task?.name?.trim() ? e.task.name.trim() : null,
      status: { kind: "pending" },
    }));
    setRows(pendingRows);

    // Shared correlation id so the outbox/events-viewer groups the whole
    // backfill as one admin gesture (task-creation + entry imports).
    const correlationId = newUuid();

    // Step 1: resolve TMetric task names to our project tasks, emitting
    // TaskCreated events for any names not already present. We match by
    // trimmed, case-insensitive name — contractors on TMetric tend to
    // write the same branch name with mixed case ("Foo-Bar" vs "foo-bar")
    // and we'd rather reuse than duplicate.
    setBusy("resolving_tasks");
    const existingTasks: TaskDefinition[] = rd.tryGet(tasksRd) ?? [];
    const existingByName = new Map<string, TaskDefinition>();
    for (const t of existingTasks) {
      existingByName.set(t.name.trim().toLowerCase(), t);
    }

    const uniqueTaskNames = Array.from(
      new Set(
        entries
          .map((e) => e.task?.name?.trim())
          .filter((v): v is string => typeof v === "string" && v.length > 0),
      ),
    );

    const taskResolution = new Map<
      string,
      { taskId: string; taskVersion: number }
    >();
    const taskLog: TaskResolutionRow[] = [];

    // Tasks live under a client, and that client must match the project's
    // own clientId (not necessarily the TMetric client picked above for
    // config resolution). Pull it from the projects list we already have.
    const projectsList = rd.tryGet(projectsRd) ?? [];
    const targetProject = projectsList.find((p) => p.id === resolvedProjectId);
    const taskClientId = targetProject?.clientId ?? resolvedClientId;

    for (const name of uniqueTaskNames) {
      const existing = existingByName.get(name.toLowerCase());
      if (existing) {
        taskResolution.set(name, {
          taskId: existing.id,
          taskVersion: existing.version,
        });
        taskLog.push({ name, taskId: existing.id, status: "reused" });
        continue;
      }
      const { payload, taskId } = buildTaskCreatedPayload({
        clientId: taskClientId,
        name,
      });
      const envelope = buildProjectEnvelope({
        projectId: resolvedProjectId,
        correlationId,
        aggregateKind: "task",
        aggregateId: taskId,
      });
      try {
        const outcome =
          await props.services.eventQueueService.submitProjectEvent(
            envelope,
            payload,
          );
        if (outcome.kind === "rejected_locally") {
          taskLog.push({
            name,
            taskId,
            status: "failed",
            reason: outcome.errors.map((e) => e.message).join("; "),
          });
          continue;
        }
        taskResolution.set(name, { taskId, taskVersion: 1 });
        taskLog.push({ name, taskId, status: "created" });
      } catch (e) {
        taskLog.push({
          name,
          taskId,
          status: "failed",
          reason: e instanceof Error ? e.message : String(e),
        });
      }
    }
    setTaskRows(taskLog);
    setBusy("importing");

    let queued = 0;
    let duplicate = 0;
    let rejected = 0;

    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      const envelope = buildContractorEnvelope({
        contractorId: resolvedContractorId,
        correlationId,
      });
      const taskName = entry.task?.name?.trim();
      const resolvedTask = taskName ? taskResolution.get(taskName) : undefined;
      // Stay `isPlaceholder: true` even when we have a task — until activity
      // routing is available via the backfill UI, the reducer needs it to
      // accept the import (non-placeholder requires BOTH task and activity).
      const payload = buildEntryImportedFromTmetricPayload({
        tmetricEntryId: String(entry.id),
        clientId: resolvedClientId,
        workspaceId: resolvedWorkspaceId,
        projectId: resolvedProjectId,
        task: resolvedTask,
        startedAt: entry.startTime,
        stoppedAt: entry.endTime!,
        description: entry.note || undefined,
        tags: entry.tags.map((t) => t.name),
        rate: rateSnapshot,
        isPlaceholder: true,
      });

      try {
        const outcome =
          await props.services.eventQueueService.submitContractorEvent(
            envelope,
            payload,
          );
        setRows((prev) =>
          prev.map((row, idx) =>
            idx === i ? { ...row, status: outcomeToStatus(outcome) } : row,
          ),
        );
        if (outcome.kind === "accepted_locally") queued += 1;
        else if (outcome.kind === "duplicate") duplicate += 1;
        else rejected += 1;
      } catch (err) {
        setRows((prev) =>
          prev.map((row, idx) =>
            idx === i
              ? {
                  ...row,
                  status: {
                    kind: "rejected",
                    reason:
                      err instanceof Error ? err.message : String(err),
                  },
                }
              : row,
          ),
        );
        rejected += 1;
      }
    }

    setBusy("idle");
    if (rejected === 0) {
      toast.success(
        `Queued ${queued} entries (${duplicate} duplicates skipped). Watch the sync pip for delivery.`,
      );
    } else {
      toast.warning(
        `${queued} queued, ${duplicate} duplicates, ${rejected} rejected locally. Review the list below.`,
      );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Backfill contractor time from TMetric
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <PickerField label="Contractor" remote={contractorsRd}>
              {(contractors) => (
                <Select value={contractorId} onValueChange={setContractorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contractor" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractors.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </PickerField>
            <PickerField label="Client" remote={clientsRd}>
              {(clients) => (
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </PickerField>
            <PickerField label="Workspace" remote={workspacesRd}>
              {(workspaces) => (
                <Select value={workspaceId} onValueChange={setWorkspaceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </PickerField>
            <PickerField label="Target project" remote={projectsRd}>
              {(projects) => (
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
              )}
            </PickerField>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tmetric-start">Start date</Label>
              <Input
                id="tmetric-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tmetric-end">End date</Label>
              <Input
                id="tmetric-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <RateHint rateRd={rateRd} contractorId={contractorIdNum} projectId={parseIntOrNull(projectId)} />
          {blocker ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-900">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{blocker}</span>
            </div>
          ) : null}
          <div>
            <Button disabled={!canSubmit} onClick={runBackfill} className="gap-2">
              <Download className="size-4" />
              {busy === "fetching"
                ? "Fetching from TMetric…"
                : busy === "resolving_tasks"
                  ? "Resolving tasks…"
                  : busy === "importing"
                    ? "Importing…"
                    : "Run backfill"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {taskRows.length > 0 ? <TaskLog rows={taskRows} /> : null}
      {rows.length > 0 ? <RowList rows={rows} /> : null}
    </div>
  );
}

function TaskLog(props: { rows: TaskResolutionRow[] }) {
  const summary = useMemo(() => {
    let reused = 0;
    let created = 0;
    let failed = 0;
    for (const r of props.rows) {
      if (r.status === "reused") reused += 1;
      else if (r.status === "created") created += 1;
      else failed += 1;
    }
    return { reused, created, failed };
  }, [props.rows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Tasks ({props.rows.length} unique · {summary.reused} reused ·{" "}
          {summary.created} created
          {summary.failed > 0 ? ` · ${summary.failed} failed` : ""})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y text-sm">
          {props.rows.map((row, i) => (
            <li
              key={`${row.taskId}-${i}`}
              className="flex items-start gap-3 px-4 py-2"
            >
              {row.status === "created" ? (
                <Sparkles className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              ) : row.status === "reused" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-sky-600" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{row.name}</div>
                <div className="text-xs text-muted-foreground">
                  {row.status === "created"
                    ? `Created · ${row.taskId.slice(0, 8)}`
                    : row.status === "reused"
                      ? `Reused · ${row.taskId.slice(0, 8)}`
                      : "Failed to create"}
                </div>
                {row.reason ? (
                  <div className="text-xs text-destructive">{row.reason}</div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function PickerField<T>(props: {
  label: string;
  remote: RemoteData<T[]>;
  children: (items: T[]) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{props.label}</Label>
      {rd
        .journey(props.remote)
        .wait(<Skeleton className="h-9 w-full" />)
        .catch(renderError)
        .map((items) => <>{props.children(items)}</>)}
    </div>
  );
}

function RateHint(props: {
  rateRd: RemoteData<ProjectRate | null>;
  contractorId: number | null;
  projectId: number | null;
}) {
  if (props.contractorId === null || props.projectId === null) return null;
  return rd
    .journey(props.rateRd)
    .wait(<p className="text-xs text-muted-foreground">Resolving rate…</p>)
    .catch((e) => (
      <p className="text-xs text-destructive">
        Couldn't resolve rate: {e instanceof Error ? e.message : String(e)}
      </p>
    ))
    .map((rate) => {
      if (rate === null) {
        return (
          <p className="text-xs text-amber-700">
            No active rate for this pair. Set one in the rate admin before
            running the backfill — the event schema requires a rate snapshot.
          </p>
        );
      }
      const snap = rate.rate;
      return (
        <p className="text-xs text-muted-foreground">
          Will snapshot rate: {snap.unitPrice} {snap.currency}/{snap.unit}.
        </p>
      );
    });
}

function RowList(props: { rows: ImportRow[] }) {
  const summary = useMemo(() => {
    let queued = 0;
    let duplicate = 0;
    let rejected = 0;
    let pending = 0;
    for (const r of props.rows) {
      if (r.status.kind === "queued") queued += 1;
      else if (r.status.kind === "duplicate") duplicate += 1;
      else if (r.status.kind === "rejected") rejected += 1;
      else pending += 1;
    }
    return { queued, duplicate, rejected, pending };
  }, [props.rows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Import log ({props.rows.length} entries · {summary.queued} queued ·{" "}
          {summary.duplicate} duplicates · {summary.rejected} rejected
          {summary.pending > 0 ? ` · ${summary.pending} pending` : ""})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y text-sm">
          {props.rows.map((row, i) => (
            <li
              key={`${row.tmetricId}-${i}`}
              className="flex items-start gap-3 px-4 py-2"
            >
              <RowStatusIcon status={row.status} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    #{row.tmetricId}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRange(row.startedAt, row.stoppedAt)}
                  </span>
                  {row.taskName ? (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {row.taskName}
                    </span>
                  ) : null}
                </div>
                <div className="truncate">
                  {row.description ?? (
                    <span className="text-muted-foreground">
                      (no description)
                    </span>
                  )}
                </div>
                {row.status.kind === "duplicate" ||
                row.status.kind === "rejected" ? (
                  <div className="text-xs text-destructive">
                    {row.status.reason}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function RowStatusIcon(props: { status: RowStatus }) {
  switch (props.status.kind) {
    case "queued":
      return <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />;
    case "duplicate":
      return <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-sky-600" />;
    case "rejected":
      return <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />;
    case "pending":
      return (
        <div className="mt-1 size-3 shrink-0 animate-pulse rounded-full bg-muted-foreground/50" />
      );
  }
}

function outcomeToStatus(
  outcome: Awaited<
    ReturnType<
      WithFrontServices["services"]["eventQueueService"]["submitContractorEvent"]
    >
  >,
): RowStatus {
  switch (outcome.kind) {
    case "accepted_locally":
      return { kind: "queued" };
    case "duplicate":
      return { kind: "duplicate", reason: "Already queued locally" };
    case "rejected_locally":
      return {
        kind: "rejected",
        reason: outcome.errors.map((e) => e.message).join("; "),
      };
  }
}

function formatRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const fmtDate = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const seconds = Math.round((end.getTime() - start.getTime()) / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return `${fmtDate(start)} ${fmtTime(start)} → ${fmtTime(end)} (${duration})`;
}

function parseIntOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function resolveTmetricConfig(
  services: WithFrontServices["services"],
  context: { clientId: number; workspaceId: number; contractorId: number },
): Promise<TMetricAuthConfig> {
  const [baseUrl, token, accountId] = await Promise.all([
    services.expressionService.ensureExpressionValue(
      context,
      `vars.tmetric_baseurl`,
      {},
    ),
    services.expressionService.ensureExpressionValue(
      context,
      `vars.tmetric_token`,
      {},
    ),
    services.expressionService.ensureExpressionValue(
      context,
      `vars.tmetric_account`,
      {},
    ),
  ]);
  return {
    baseUrl: String(baseUrl),
    token: String(token),
    accountId: String(accountId),
  };
}
