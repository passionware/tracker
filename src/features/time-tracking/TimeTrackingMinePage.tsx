import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { useCurrentContractor } from "@/features/time-tracking/_common/useCurrentContractor.ts";
import {
  formatElapsedSeconds,
  useElapsedSeconds,
} from "@/features/time-tracking/_common/useElapsedSeconds.ts";
import {
  buildContractorEnvelope,
  buildSubmitForApprovalPayload,
  newUuid,
} from "@/features/time-tracking/_common/trackerCommands.ts";
import {
  type OptimisticEntry,
  useOptimisticEntries,
} from "@/features/time-tracking/_common/useOptimisticEntries.ts";
import { EntryEditorSheet } from "@/features/time-tracking/entry-editor/EntryEditorSheet.tsx";
import { TrackerBarContractorPicker } from "@/features/time-tracking/tracker-bar/TrackerBarContractorPicker.tsx";
import { cn } from "@/lib/utils.ts";
import type { ClientSpec, WorkspaceSpec } from "@/routing/routingUtils.ts";
import { projectQueryUtils, type Project } from "@/api/project/project.api.ts";
import { rd } from "@passionware/monads";
import { format } from "date-fns";
import { AlertCircle, Loader2, Send } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * Contractor's "my time" page — the daily inbox where they review what
 * they've tracked and submit batches for approval.
 *
 * Displayed:
 *   - draft entries grouped by day (most recent first)
 *   - per-entry checkbox + a sticky submit-for-approval bar at the top
 *   - placeholder badge / failed-sync badge
 *   - optimistic rows (still in the queue) marked with a "syncing" pill
 *
 * Out of scope (tracked by separate todos):
 *   - per-entry edit drawer (entry_editor_drawer)
 *   - approval queue page (approval_workflow)
 *   - tag chips / project filter chips (entry_tags, etc.)
 */
export function TimeTrackingMinePage(
  props: WithFrontServices & {
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  const { contractorId } = useCurrentContractor(props.services);

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
        <BreadcrumbPage>My time</BreadcrumbPage>,
      ]}
    >
      {contractorId === null ? (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Pick a contractor</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>
              The "My time" page shows the entries belonging to a single
              contractor. Pick which contractor you're tracking time as —
              the choice is remembered between sessions.
            </p>
            <TrackerBarContractorPicker services={props.services} />
          </CardContent>
        </Card>
      ) : (
        <MineForContractor {...props} contractorId={contractorId} />
      )}
    </CommonPageContainer>
  );
}

function MineForContractor(
  props: WithFrontServices & { contractorId: number },
) {
  const entriesRd = useOptimisticEntries(
    props,
    useMemo(
      () => ({
        contractorId: props.contractorId,
        startedFrom: startOfDayUtc(daysAgo(14)),
        limit: 500,
      }),
      [props.contractorId],
    ),
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const entries = rd.tryGet(entriesRd) ?? [];
  const editingEntry = useMemo(
    () =>
      editingEntryId !== null
        ? entries.find((e) => e.entryId === editingEntryId) ?? null
        : null,
    [editingEntryId, entries],
  );
  const selectableIds = useMemo(
    () =>
      entries
        .filter(
          (e) =>
            e.approvalState === "draft" &&
            e.stoppedAt !== null &&
            !e.isPlaceholder,
        )
        .map((e) => e.entryId),
    [entries],
  );
  const placeholderEntries = useMemo(
    () =>
      entries.filter(
        (e) => e.isPlaceholder && e.deletedAt === null,
      ),
    [entries],
  );
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(selectableIds));
  };
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      const envelope = buildContractorEnvelope({
        contractorId: props.contractorId,
        correlationId: newUuid(),
      });
      const payload = buildSubmitForApprovalPayload(
        Array.from(selected),
        note.trim() || undefined,
      );
      const outcome =
        await props.services.eventQueueService.submitContractorEvent(
          envelope,
          payload,
        );
      if (outcome.kind === "rejected_locally") {
        toast.error(
          `Couldn't submit: ${outcome.errors.map((e) => e.message).join("; ")}`,
        );
        return;
      }
      toast.success(`Submitted ${selected.size} entries for approval`);
      setSelected(new Set());
      setNote("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {placeholderEntries.length > 0 ? (
        <PlaceholderBanner
          count={placeholderEntries.length}
          onJumpToFirst={() =>
            setEditingEntryId(placeholderEntries[0].entryId)
          }
        />
      ) : null}
      {selected.size > 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-end">
            <div className="flex-1 flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Submitting {selected.size} entries
              </span>
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note for the approver"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-1.5"
            >
              <Send className="size-4" />
              {submitting ? "Submitting…" : "Submit for approval"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {rd
        .journey(entriesRd)
        .wait(
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>,
        )
        .catch(renderError)
        .map(() => (
          <EntriesList
            services={props.services}
            entries={entries}
            selected={selected}
            onToggleOne={toggleOne}
            onToggleAll={toggleAll}
            allSelected={allSelected}
            anySelectable={selectableIds.length > 0}
            onEdit={setEditingEntryId}
          />
        ))}

      {editingEntry ? (
        <EntryEditorSheet
          services={props.services}
          entry={editingEntry}
          neighbours={entries.filter(
            (e) =>
              e.entryId !== editingEntry.entryId &&
              sameLocalDay(e.startedAt, editingEntry.startedAt),
          )}
          open
          onOpenChange={(open) => {
            if (!open) setEditingEntryId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function sameLocalDay(isoA: string, isoB: string): boolean {
  return format(new Date(isoA), "yyyy-MM-dd") === format(new Date(isoB), "yyyy-MM-dd");
}

function EntriesList(
  props: WithFrontServices & {
    entries: OptimisticEntry[];
    selected: Set<string>;
    onToggleOne: (id: string) => void;
    onToggleAll: () => void;
    allSelected: boolean;
    anySelectable: boolean;
    onEdit: (entryId: string) => void;
  },
) {
  const projectIds = useMemo(
    () => Array.from(new Set(props.entries.map((e) => e.projectId))),
    [props.entries],
  );
  const projectLookup = useProjectLookup(props, projectIds);
  const groups = useMemo(() => groupByDay(props.entries), [props.entries]);

  if (props.entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No entries in the last 14 days. Hit Start in the tracker bar to
          begin.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">My entries</CardTitle>
        {props.anySelectable ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={props.allSelected}
              onCheckedChange={() => props.onToggleAll()}
            />
            Select all draft entries
          </label>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pt-0">
        {groups.map((group) => (
          <div key={group.dayKey} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between border-b border-border pb-1.5">
              <h3 className="text-sm font-medium">{group.label}</h3>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatElapsedSeconds(group.totalSeconds)}
              </span>
            </div>
            <ul className="flex flex-col divide-y divide-border">
              {group.entries.map((entry) => (
                <EntryRow
                  key={entry.entryId}
                  entry={entry}
                  project={projectLookup.get(entry.projectId) ?? null}
                  selected={props.selected.has(entry.entryId)}
                  onToggle={() => props.onToggleOne(entry.entryId)}
                  onEdit={() => props.onEdit(entry.entryId)}
                  selectable={
                    entry.approvalState === "draft" &&
                    entry.stoppedAt !== null &&
                    !entry.isPlaceholder
                  }
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
  entry: OptimisticEntry;
  project: Project | null;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  selectable: boolean;
}) {
  const { entry } = props;
  const running = entry.stoppedAt === null && entry.deletedAt === null;
  const liveSeconds = useElapsedSeconds(running ? entry.startedAt : null);
  const seconds = running
    ? liveSeconds ?? 0
    : entry.stoppedAt
      ? Math.max(
          0,
          Math.floor(
            (Date.parse(entry.stoppedAt) - Date.parse(entry.startedAt)) / 1000,
          ),
        )
      : 0;

  return (
    <li
      className={cn(
        "flex items-center gap-3 py-2 -mx-2 px-2 rounded-md transition-colors hover:bg-muted/50 cursor-pointer",
        entry.deletedAt !== null && "opacity-50 cursor-not-allowed",
      )}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("[data-no-edit]")) return;
        if (entry.deletedAt === null) props.onEdit();
      }}
    >
      <span data-no-edit className="contents">
        <Checkbox
          checked={props.selected}
          disabled={!props.selectable}
          onCheckedChange={() => props.onToggle()}
        />
      </span>
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium truncate">
            {props.project?.name ?? `Project ${entry.projectId}`}
          </span>
          {entry.isPlaceholder ? (
            <Chip className="border-amber-300 bg-amber-50 text-amber-800">
              <AlertCircle className="size-3" />
              Needs detail
            </Chip>
          ) : null}
          <ApprovalBadge state={entry.approvalState} />
          {entry.isPending ? (
            <Chip className="border-sky-200 bg-sky-50 text-sky-700">
              <Loader2 className="size-3 animate-spin" />
              Syncing
            </Chip>
          ) : null}
          {entry.isFailed ? (
            <Chip className="border-red-300 bg-red-50 text-red-700">
              <AlertCircle className="size-3" />
              Sync failed
            </Chip>
          ) : null}
          {running ? (
            <Chip className="border-emerald-200 bg-emerald-100 text-emerald-900">
              Running
            </Chip>
          ) : null}
        </div>
        {entry.description ? (
          <span className="text-xs text-muted-foreground truncate">
            {entry.description}
          </span>
        ) : null}
        <span className="text-[11px] text-muted-foreground">
          {format(new Date(entry.startedAt), "HH:mm")}
          {entry.stoppedAt
            ? ` – ${format(new Date(entry.stoppedAt), "HH:mm")}`
            : null}
        </span>
      </div>
      <span className="font-mono text-sm tabular-nums">
        {formatElapsedSeconds(seconds)}
      </span>
    </li>
  );
}

function ApprovalBadge(props: { state: OptimisticEntry["approvalState"] }) {
  switch (props.state) {
    case "draft":
      return <Chip className="border-border text-muted-foreground">Draft</Chip>;
    case "submitted":
      return (
        <Chip className="border-sky-200 bg-sky-50 text-sky-700">Submitted</Chip>
      );
    case "approved":
      return (
        <Chip className="border-emerald-200 bg-emerald-50 text-emerald-700">
          Approved
        </Chip>
      );
    case "rejected":
      return (
        <Chip className="border-red-200 bg-red-50 text-red-700">Rejected</Chip>
      );
  }
}

function PlaceholderBanner(props: {
  count: number;
  onJumpToFirst: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <AlertCircle className="size-4 shrink-0" />
      <div className="flex-1">
        <span className="font-medium">
          {props.count} {props.count === 1 ? "entry needs" : "entries need"} detail
        </span>
        <span className="ml-1 opacity-80">
          — fill in task and activity before they can be submitted for
          approval.
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-7 border-amber-300 bg-white text-xs hover:bg-amber-100"
        onClick={props.onJumpToFirst}
      >
        Open first
      </Button>
    </div>
  );
}

function Chip(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
        props.className,
      )}
    >
      {props.children}
    </span>
  );
}

function useProjectLookup(
  props: WithFrontServices,
  projectIds: number[],
) {
  // Single batched query per visible window. The service exposes only
  // `useProjects` with a query, so we filter to the relevant ids here.
  const all = props.services.projectService.useProjects(
    useMemo(() => projectQueryUtils.ofDefault(), []),
  );
  return useMemo(() => {
    const list = rd.tryGet(all);
    const map = new Map<number, Project>();
    if (!list) return map;
    const wanted = new Set(projectIds);
    for (const p of list) if (wanted.has(p.id)) map.set(p.id, p);
    return map;
  }, [all, projectIds]);
}

interface DayGroup {
  dayKey: string;
  label: string;
  totalSeconds: number;
  entries: OptimisticEntry[];
}

function groupByDay(entries: OptimisticEntry[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const e of entries) {
    const startedAt = new Date(e.startedAt);
    const dayKey = format(startedAt, "yyyy-MM-dd");
    let group = groups.get(dayKey);
    if (!group) {
      group = {
        dayKey,
        label: humanDayLabel(startedAt),
        totalSeconds: 0,
        entries: [],
      };
      groups.set(dayKey, group);
    }
    if (e.stoppedAt !== null) {
      group.totalSeconds += Math.max(
        0,
        Math.floor(
          (Date.parse(e.stoppedAt) - Date.parse(e.startedAt)) / 1000,
        ),
      );
    }
    group.entries.push(e);
  }
  return Array.from(groups.values()).sort((a, b) =>
    a.dayKey < b.dayKey ? 1 : -1,
  );
}

function humanDayLabel(date: Date) {
  const today = new Date();
  const todayKey = format(today, "yyyy-MM-dd");
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayKey = format(date, "yyyy-MM-dd");
  if (dayKey === todayKey) return `Today · ${format(date, "EEE d MMM")}`;
  if (dayKey === format(yesterday, "yyyy-MM-dd"))
    return `Yesterday · ${format(date, "EEE d MMM")}`;
  return format(date, "EEEE d MMM");
}

function startOfDayUtc(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
