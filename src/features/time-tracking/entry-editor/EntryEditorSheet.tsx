import type { Activity } from "@/api/activity/activity.api.ts";
import { projectQueryUtils } from "@/api/project/project.api.ts";
import type { TaskDefinition } from "@/api/task-definition/task-definition.api.ts";
import {
  emptyContractorStreamState,
  type ContractorStreamState,
  type EntryState,
} from "@/api/time-event/aggregates";
import type { ContractorEventPayload } from "@/api/time-event/time-event.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import type { WithFrontServices } from "@/core/frontServices.ts";
import { TagMultiSelect } from "@/features/time-tracking/_common/TagMultiSelect.tsx";
import { formatElapsedSeconds } from "@/features/time-tracking/_common/useElapsedSeconds.ts";
import type { OptimisticEntry } from "@/features/time-tracking/_common/useOptimisticEntries.ts";
import {
  buildContractorEnvelope,
  buildEntryActivityAssignedPayload,
  buildEntryDeletedPayload,
  buildEntryDescriptionChangedPayload,
  buildEntryMergedPayload,
  buildEntryRevertedToDraftPayload,
  buildEntryRoutingChangedPayload,
  buildEntrySplitPayload,
  buildEntryTagsChangedPayload,
  buildEntryTaskAssignedPayload,
  newUuid,
} from "@/features/time-tracking/_common/trackerCommands.ts";
import { rd } from "@passionware/monads";
import { format } from "date-fns";
import {
  AlertCircle,
  GitMerge,
  RotateCcw,
  Scissors,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * Drawer for editing one time entry. Each save emits a single contractor
 * event through `EventQueueService`; the drawer stays open so the user can
 * string several edits together — they all share one `correlationId` so
 * audit replay groups the gesture.
 *
 * The drawer is intentionally form-free: each section has its own
 * save-on-click button so the optimistic overlay can refresh the projection
 * piece by piece. This mirrors `TaskEditorSheet`.
 *
 * Capabilities:
 *   - description, tags (slug-ish), task+activity (placeholder resolution)
 *   - routing change (re-home the entry to a different project)
 *   - split with gap (the "I took a break at 14:00" flow)
 *   - merge with adjacent entry (only when attributes match)
 *   - approval-state controls (revert to draft)
 *   - soft delete
 *
 * Mutations are blocked by the shared aggregate validator whenever the entry
 * isn't in `draft` / `rejected`. The drawer surfaces those failures via
 * toast. Revert-to-draft is available as a way out.
 */
export interface EntryEditorSheetProps extends WithFrontServices {
  entry: OptimisticEntry;
  /**
   * Sibling entries on the same contractor — used to offer
   * `EntryMerged` with an adjacent entry that shares routing/task/activity.
   * Typically the rest of the day the user is looking at.
   */
  neighbours: OptimisticEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EntryEditorSheet(props: EntryEditorSheetProps) {
  const { entry } = props;
  const [correlationId, setCorrelationId] = useState(() => newUuid());
  useEffect(() => {
    if (props.open) setCorrelationId(newUuid());
  }, [props.open, entry.entryId]);

  // The pre-flight validator folds queued events onto `serverSnapshot`.
  // Without a snapshot it starts from an empty stream and rejects every
  // entry-targeted mutation (e.g. EntryTaskAssigned) with `entry.not_found`.
  // We don't have the full contractor stream here, but the validator only
  // needs to see the entry being edited — derive a minimal snapshot from
  // the projected row the drawer is rendering. Neighbours are included so
  // that merge/split operations (which reference adjacent entries) also
  // validate cleanly.
  const serverSnapshot = useMemo(
    () => buildEntrySnapshot(entry.contractorId, entry, props.neighbours),
    [entry, props.neighbours],
  );

  const submit = async (
    payload: ContractorEventPayload,
    successMsg: string,
  ) => {
    const envelope = buildContractorEnvelope({
      contractorId: entry.contractorId,
      correlationId,
    });
    const outcome = await props.services.eventQueueService.submitContractorEvent(
      envelope,
      payload,
      { serverSnapshot },
    );
    if (outcome.kind === "rejected_locally") {
      toast.error(
        `Couldn't save: ${outcome.errors.map((e) => e.message).join("; ")}`,
      );
      return false;
    }
    toast.success(successMsg);
    return true;
  };

  const isStopped = entry.stoppedAt !== null;
  const canMutate =
    entry.approvalState === "draft" || entry.approvalState === "rejected";

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-[34rem] sm:max-w-none">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Time entry
            <ApprovalChip state={entry.approvalState} />
            {entry.isPlaceholder && (
              <Badge tone="secondary" variant="warning" size="sm">
                needs detail
              </Badge>
            )}
            {entry.deletedAt !== null && (
              <Badge tone="secondary" variant="neutral" size="sm">
                deleted
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            <EntrySummaryLine entry={entry} />
          </SheetDescription>
        </SheetHeader>

        {!canMutate && entry.deletedAt === null ? (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <AlertCircle className="size-4 shrink-0" />
            <span>
              This entry is <b>{entry.approvalState}</b> — edits are blocked
              until it's reverted to draft.
            </span>
          </div>
        ) : null}

        <div className="mt-4 flex max-h-[calc(100vh-14rem)] flex-col gap-5 overflow-y-auto pr-1">
          <RoutingSection
            services={props.services}
            entry={entry}
            disabled={!canMutate || entry.deletedAt !== null}
            onSubmit={submit}
          />
          <TaskActivitySection
            services={props.services}
            entry={entry}
            disabled={!canMutate || entry.deletedAt !== null}
            onSubmit={submit}
          />
          <DescriptionSection
            entry={entry}
            disabled={!canMutate || entry.deletedAt !== null}
            onSubmit={submit}
          />
          <TagsSection
            entry={entry}
            disabled={!canMutate || entry.deletedAt !== null}
            onSubmit={submit}
            services={props.services}
          />
          {isStopped ? (
            <SplitSection
              entry={entry}
              disabled={!canMutate || entry.deletedAt !== null}
              onSubmit={submit}
              onClose={() => props.onOpenChange(false)}
            />
          ) : null}
          {isStopped ? (
            <MergeSection
              entry={entry}
              neighbours={props.neighbours}
              disabled={!canMutate || entry.deletedAt !== null}
              onSubmit={submit}
              onClose={() => props.onOpenChange(false)}
            />
          ) : null}
          <LineageSection entry={entry} />
        </div>

        <SheetFooter className="mt-4 flex-row justify-end gap-2">
          <ApprovalControls
            entry={entry}
            services={props.services}
            onSubmit={submit}
          />
          <DeleteButton
            entry={entry}
            disabled={!canMutate}
            onSubmit={submit}
            onClose={() => props.onOpenChange(false)}
          />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

type Submit = (
  payload: ContractorEventPayload,
  successMsg: string,
) => Promise<boolean>;

/**
 * Stuff the drawer's entry + its neighbour entries into a
 * `ContractorStreamState` so the pre-flight validator can look them up by
 * id. We strip the optimistic-overlay fields (`isPending` / `isFailed`) —
 * they're UI-only and not part of the aggregate state.
 */
function buildEntrySnapshot(
  contractorId: number,
  entry: OptimisticEntry,
  neighbours: ReadonlyArray<OptimisticEntry>,
): ContractorStreamState {
  const toEntryState = (o: OptimisticEntry): EntryState => ({
    entryId: o.entryId,
    contractorId: o.contractorId,
    clientId: o.clientId,
    workspaceId: o.workspaceId,
    projectId: o.projectId,
    taskId: o.taskId,
    taskVersion: o.taskVersion,
    activityId: o.activityId,
    activityVersion: o.activityVersion,
    startedAt: o.startedAt,
    stoppedAt: o.stoppedAt,
    description: o.description,
    tags: [...o.tags],
    rate: o.rate,
    isPlaceholder: o.isPlaceholder,
    approvalState: o.approvalState,
    interruptedEntryId: o.interruptedEntryId,
    resumedFromEntryId: o.resumedFromEntryId,
    deletedAt: o.deletedAt,
    lineage: [...o.lineage],
  });

  const entries: Record<string, EntryState> = {};
  entries[entry.entryId] = toEntryState(entry);
  for (const n of neighbours) {
    if (!entries[n.entryId]) entries[n.entryId] = toEntryState(n);
  }

  return {
    ...emptyContractorStreamState,
    contractorId,
    entries,
    importedTmetricIds: {},
  };
}

function ApprovalChip({ state }: { state: OptimisticEntry["approvalState"] }) {
  switch (state) {
    case "draft":
      return (
        <Badge tone="secondary" variant="neutral" size="sm">
          draft
        </Badge>
      );
    case "submitted":
      return (
        <Badge tone="secondary" variant="info" size="sm">
          submitted
        </Badge>
      );
    case "approved":
      return (
        <Badge tone="secondary" variant="success" size="sm">
          approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge tone="secondary" variant="destructive" size="sm">
          rejected
        </Badge>
      );
  }
}

function EntrySummaryLine({ entry }: { entry: OptimisticEntry }) {
  const start = new Date(entry.startedAt);
  const stop = entry.stoppedAt ? new Date(entry.stoppedAt) : null;
  const seconds =
    stop !== null
      ? Math.max(0, Math.floor((stop.getTime() - start.getTime()) / 1000))
      : null;
  return (
    <span className="tabular-nums">
      {format(start, "EEE d MMM · HH:mm")}
      {stop ? ` – ${format(stop, "HH:mm")}` : " – running"}
      {seconds !== null ? ` · ${formatElapsedSeconds(seconds)}` : null}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

function RoutingSection({
  services,
  entry,
  disabled,
  onSubmit,
}: {
  services: WithFrontServices["services"];
  entry: OptimisticEntry;
  disabled: boolean;
  onSubmit: Submit;
}) {
  const projects = services.projectService.useProjects(
    useMemo(() => projectQueryUtils.ofDefault(), []),
  );
  const list = rd.tryGet(projects) ?? [];
  const current = list.find((p) => p.id === entry.projectId) ?? null;

  const [pickedId, setPickedId] = useState<number>(entry.projectId);
  useEffect(() => setPickedId(entry.projectId), [entry.projectId]);

  const next = list.find((p) => p.id === pickedId) ?? null;
  const dirty = pickedId !== entry.projectId;

  const handleSave = async () => {
    if (!next) return;
    const workspaceId = next.workspaceIds[0] ?? entry.workspaceId;
    await onSubmit(
      buildEntryRoutingChangedPayload(entry.entryId, {
        clientId: next.clientId,
        workspaceId,
        projectId: next.id,
      }),
      "Routing updated",
    );
  };

  return (
    <section className="flex flex-col gap-1.5">
      <Label>Project</Label>
      <div className="flex items-center gap-2">
        <Select
          value={String(pickedId)}
          onValueChange={(v) => setPickedId(Number(v))}
          disabled={disabled || list.length === 0}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={current?.name ?? `Project ${entry.projectId}`} />
          </SelectTrigger>
          <SelectContent>
            {list
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled || !dirty || !next}
          onClick={handleSave}
        >
          Re-route
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Moves this entry to another project. Task &amp; activity are cleared
        when they no longer belong here.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Task + activity (placeholder resolution)
// ---------------------------------------------------------------------------

function TaskActivitySection({
  services,
  entry,
  disabled,
  onSubmit,
}: {
  services: WithFrontServices["services"];
  entry: OptimisticEntry;
  disabled: boolean;
  onSubmit: Submit;
}) {
  const tasksRd = services.taskDefinitionService.useTasks(
    useMemo(
      () => ({ projectId: entry.projectId, includeCompleted: true, limit: 200 }),
      [entry.projectId],
    ),
  );
  const activitiesRd = services.activityService.useActivities(
    useMemo(() => ({ projectId: entry.projectId, limit: 200 }), [entry.projectId]),
  );
  const tasks = rd.tryGet(tasksRd) ?? [];
  const activities = rd.tryGet(activitiesRd) ?? [];

  const [taskId, setTaskId] = useState<string | null>(entry.taskId);
  const [activityId, setActivityId] = useState<string | null>(entry.activityId);
  useEffect(() => setTaskId(entry.taskId), [entry.taskId, entry.projectId]);
  useEffect(() => setActivityId(entry.activityId), [entry.activityId, entry.projectId]);

  const selectedTask = tasks.find((t) => t.id === taskId) ?? null;
  const selectedActivity = activities.find((a) => a.id === activityId) ?? null;

  const taskChanged = taskId !== entry.taskId;
  const activityChanged = activityId !== entry.activityId;
  const dirty = taskChanged || activityChanged;
  const canSave =
    !disabled &&
    dirty &&
    taskId !== null &&
    activityId !== null &&
    selectedTask !== null &&
    selectedActivity !== null;

  const handleSave = async () => {
    if (!selectedTask || !selectedActivity) return;
    // When only the activity changed we emit the narrower event; otherwise
    // we reassign both (the schema requires the pair).
    const payload =
      taskChanged
        ? buildEntryTaskAssignedPayload(
            entry.entryId,
            { taskId: selectedTask.id, taskVersion: selectedTask.version },
            {
              activityId: selectedActivity.id,
              activityVersion: selectedActivity.version,
            },
          )
        : buildEntryActivityAssignedPayload(entry.entryId, {
            activityId: selectedActivity.id,
            activityVersion: selectedActivity.version,
          });
    await onSubmit(
      payload,
      entry.isPlaceholder ? "Detail filled in" : "Assignment updated",
    );
  };

  return (
    <section className="flex flex-col gap-1.5">
      <Label>Task &amp; activity</Label>
      <div className="grid grid-cols-2 gap-2">
        <TaskPicker
          tasks={tasks}
          value={taskId}
          onChange={setTaskId}
          disabled={disabled}
        />
        <ActivityPicker
          activities={activities}
          value={activityId}
          onChange={setActivityId}
          disabled={disabled}
        />
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          disabled={!canSave}
          onClick={handleSave}
        >
          Save
        </Button>
      </div>
      {entry.isPlaceholder ? (
        <p className="text-[11px] text-amber-800">
          This is a placeholder entry — filling task &amp; activity will clear
          the "needs detail" badge.
        </p>
      ) : null}
    </section>
  );
}

/**
 * Grace window during which completed tasks still appear in the
 * suggestion dropdown. Time entries are frequently attributed to a task
 * a few days after it's marked done (final review, commit cleanup,
 * writeup), so hiding them the moment `completedAt` is set is too
 * aggressive. Beyond this window the task is only visible if it's
 * already the selected value on the entry being edited.
 */
const COMPLETED_TASK_GRACE_DAYS = 14;

function TaskPicker(props: {
  tasks: TaskDefinition[];
  value: string | null;
  onChange: (next: string | null) => void;
  disabled: boolean;
}) {
  const now = Date.now();
  const cutoffMs = now - COMPLETED_TASK_GRACE_DAYS * 24 * 3600 * 1000;
  const visible = props.tasks.filter((t) => {
    if (t.id === props.value) return true;
    if (t.completedAt === null) return true;
    return t.completedAt.getTime() >= cutoffMs;
  });
  const hiddenCompleted = props.tasks.length - visible.length;
  if (visible.length === 0) {
    return (
      <div className="rounded-md border px-2 py-2 text-xs text-muted-foreground">
        No tasks in this project.
      </div>
    );
  }
  return (
    <Select
      value={props.value ?? ""}
      onValueChange={(v) => props.onChange(v === "" ? null : v)}
      disabled={props.disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="Task…" />
      </SelectTrigger>
      <SelectContent>
        {visible
          .slice()
          .sort((a, b) => {
            // Open tasks first, then by name — keeps the dropdown's top
            // rows actionable even when there are a few recently-done
            // ones still hanging around.
            if ((a.completedAt === null) !== (b.completedAt === null)) {
              return a.completedAt === null ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          })
          .map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
              {t.completedAt !== null ? " · done" : null}
            </SelectItem>
          ))}
        {hiddenCompleted > 0 ? (
          <div className="px-2 py-1 text-[10px] text-muted-foreground">
            {hiddenCompleted} older completed task
            {hiddenCompleted === 1 ? "" : "s"} hidden — open the Tasks
            page to reopen one.
          </div>
        ) : null}
      </SelectContent>
    </Select>
  );
}

function ActivityPicker(props: {
  activities: Activity[];
  value: string | null;
  onChange: (next: string | null) => void;
  disabled: boolean;
}) {
  if (props.activities.length === 0) {
    return (
      <div className="rounded-md border px-2 py-2 text-xs text-muted-foreground">
        No activities in this project.
      </div>
    );
  }
  return (
    <Select
      value={props.value ?? ""}
      onValueChange={(v) => props.onChange(v === "" ? null : v)}
      disabled={props.disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="Activity…" />
      </SelectTrigger>
      <SelectContent>
        {props.activities
          .slice()
          .filter((a) => !a.isArchived)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// Description
// ---------------------------------------------------------------------------

function DescriptionSection({
  entry,
  disabled,
  onSubmit,
}: {
  entry: OptimisticEntry;
  disabled: boolean;
  onSubmit: Submit;
}) {
  const [desc, setDesc] = useState(entry.description ?? "");
  useEffect(() => setDesc(entry.description ?? ""), [entry.description]);
  const trimmed = desc.trim();
  const next: string | null = trimmed.length === 0 ? null : trimmed;
  const dirty = next !== (entry.description ?? null);
  return (
    <section className="flex flex-col gap-1.5">
      <Label htmlFor="entry-description">Description</Label>
      <Textarea
        id="entry-description"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        rows={3}
        maxLength={2000}
        disabled={disabled}
        placeholder="What did you spend this time on?"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          disabled={disabled || !dirty}
          onClick={() =>
            onSubmit(
              buildEntryDescriptionChangedPayload(entry.entryId, next),
              "Description saved",
            )
          }
        >
          Save
        </Button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

function TagsSection({
  entry,
  disabled,
  onSubmit,
  services,
}: {
  entry: OptimisticEntry;
  disabled: boolean;
  onSubmit: Submit;
} & WithFrontServices) {
  const [tags, setTags] = useState<string[]>(entry.tags);
  useEffect(() => setTags(entry.tags), [entry.tags]);

  const suggestionsRd = services.timeEntryService.useContractorTagSuggestions(
    entry.contractorId,
    { days: 60, limit: 50 },
  );
  const suggestions = rd.tryGet(suggestionsRd) ?? [];

  const dirty =
    tags.length !== entry.tags.length ||
    tags.some((t, i) => t !== entry.tags[i]);

  return (
    <section className="flex flex-col gap-1.5">
      <Label>Tags</Label>
      <TagMultiSelect
        value={tags}
        onChange={setTags}
        suggestions={suggestions}
        disabled={disabled}
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={disabled || !dirty}
          onClick={() =>
            onSubmit(buildEntryTagsChangedPayload(entry.entryId, tags), "Tags saved")
          }
        >
          Save
        </Button>
        {dirty ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setTags(entry.tags)}
            disabled={disabled}
          >
            Revert
          </Button>
        ) : null}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Split
// ---------------------------------------------------------------------------

function SplitSection({
  entry,
  disabled,
  onSubmit,
  onClose,
}: {
  entry: OptimisticEntry;
  disabled: boolean;
  onSubmit: Submit;
  onClose: () => void;
}) {
  const startMs = Date.parse(entry.startedAt);
  const stopMs = entry.stoppedAt ? Date.parse(entry.stoppedAt) : null;
  const defaultSplit = useMemo(() => {
    if (stopMs === null) return "";
    const mid = new Date((startMs + stopMs) / 2);
    return toLocalInputValue(mid);
  }, [startMs, stopMs]);
  const [splitLocal, setSplitLocal] = useState<string>(defaultSplit);
  const [gapMinutes, setGapMinutes] = useState<string>("0");
  useEffect(() => setSplitLocal(defaultSplit), [defaultSplit]);

  const splitMs = splitLocal.length > 0 ? Date.parse(splitLocal) : NaN;
  const gap = Math.max(0, Math.floor(Number(gapMinutes) * 60) || 0);
  const isInRange =
    stopMs !== null &&
    Number.isFinite(splitMs) &&
    splitMs > startMs &&
    splitMs < stopMs &&
    splitMs + gap * 1000 <= stopMs;

  const handleSplit = async () => {
    if (!isInRange) return;
    const { payload } = buildEntrySplitPayload({
      sourceEntryId: entry.entryId,
      splitAt: new Date(splitMs).toISOString(),
      gapSeconds: gap,
    });
    const ok = await onSubmit(
      payload,
      gap === 0 ? "Entry split" : `Split with ${gap}s gap`,
    );
    if (ok) onClose();
  };

  return (
    <section className="flex flex-col gap-1.5">
      <Label>Split</Label>
      <p className="text-[11px] text-muted-foreground">
        Cut this entry into two at a wall-clock moment. An optional gap (in
        minutes) is discarded entirely — useful when you forgot to stop
        before a break.
      </p>
      <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
        <div className="flex flex-col gap-1">
          <Label className="text-[11px] text-muted-foreground">Cut at</Label>
          <Input
            type="datetime-local"
            value={splitLocal}
            onChange={(e) => setSplitLocal(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[11px] text-muted-foreground">Gap (min)</Label>
          <Input
            type="number"
            min={0}
            value={gapMinutes}
            onChange={(e) => setGapMinutes(e.target.value)}
            disabled={disabled}
            className="w-24"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled || !isInRange}
          onClick={handleSplit}
          className="gap-1.5"
        >
          <Scissors className="size-3.5" />
          Split
        </Button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

function MergeSection({
  entry,
  neighbours,
  disabled,
  onSubmit,
  onClose,
}: {
  entry: OptimisticEntry;
  neighbours: OptimisticEntry[];
  disabled: boolean;
  onSubmit: Submit;
  onClose: () => void;
}) {
  const candidates = useMemo(
    () =>
      neighbours
        .filter(
          (n) =>
            n.entryId !== entry.entryId &&
            n.deletedAt === null &&
            n.stoppedAt !== null &&
            n.approvalState !== "approved" &&
            n.approvalState !== "submitted" &&
            n.clientId === entry.clientId &&
            n.workspaceId === entry.workspaceId &&
            n.projectId === entry.projectId &&
            n.taskId === entry.taskId &&
            n.activityId === entry.activityId,
        )
        .map((n) => ({
          entry: n,
          gapSeconds: gapBetween(entry, n),
        }))
        .sort((a, b) => a.gapSeconds - b.gapSeconds)
        .slice(0, 4),
    [entry, neighbours],
  );

  if (candidates.length === 0) {
    return (
      <section className="flex flex-col gap-1.5">
        <Label>Merge</Label>
        <p className="text-[11px] text-muted-foreground">
          No adjacent entries in this day share this entry's project, task,
          activity, and rate — nothing to merge with.
        </p>
      </section>
    );
  }

  const handleMerge = async (other: OptimisticEntry) => {
    const [left, right] =
      Date.parse(entry.startedAt) <= Date.parse(other.startedAt)
        ? [entry, other]
        : [other, entry];
    const { payload } = buildEntryMergedPayload(left.entryId, right.entryId);
    const ok = await onSubmit(payload, "Entries merged");
    if (ok) onClose();
  };

  return (
    <section className="flex flex-col gap-1.5">
      <Label>Merge</Label>
      <p className="text-[11px] text-muted-foreground">
        Fuse this entry with an adjacent one (same project/task/activity/rate).
        The merged entry spans both time ranges.
      </p>
      <ul className="flex flex-col gap-1">
        {candidates.map(({ entry: other, gapSeconds }) => (
          <li
            key={other.entryId}
            className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs"
          >
            <div className="flex flex-col">
              <span className="tabular-nums">
                {format(new Date(other.startedAt), "HH:mm")} –{" "}
                {format(new Date(other.stoppedAt!), "HH:mm")}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {gapSeconds === 0
                  ? "adjacent"
                  : `${Math.round(gapSeconds / 60)} min gap`}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => handleMerge(other)}
              className="gap-1.5"
            >
              <GitMerge className="size-3.5" />
              Merge
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function gapBetween(a: OptimisticEntry, b: OptimisticEntry): number {
  const aStart = Date.parse(a.startedAt);
  const aStop = a.stoppedAt ? Date.parse(a.stoppedAt) : aStart;
  const bStart = Date.parse(b.startedAt);
  const bStop = b.stoppedAt ? Date.parse(b.stoppedAt) : bStart;
  if (aStop <= bStart) return Math.max(0, Math.floor((bStart - aStop) / 1000));
  if (bStop <= aStart) return Math.max(0, Math.floor((aStart - bStop) / 1000));
  return 0;
}

// ---------------------------------------------------------------------------
// Lineage (read-only)
// ---------------------------------------------------------------------------

function LineageSection({ entry }: { entry: OptimisticEntry }) {
  const rows: Array<{ label: string; value: string }> = [];
  if (entry.interruptedEntryId) {
    rows.push({ label: "Jump-on from", value: entry.interruptedEntryId });
  }
  if (entry.resumedFromEntryId) {
    rows.push({ label: "Resumed from", value: entry.resumedFromEntryId });
  }
  if (entry.lineage.length > 0) {
    for (const l of entry.lineage) {
      rows.push({
        label: l.kind,
        value: l.sourceEntryIds.join(", "),
      });
    }
  }
  if (rows.length === 0) return null;
  return (
    <section className="flex flex-col gap-1.5">
      <Label>Lineage</Label>
      <ul className="flex flex-col gap-0.5 text-[11px] text-muted-foreground font-mono">
        {rows.map((r, i) => (
          <li key={i} className="flex gap-2">
            <span className="uppercase tracking-wider">{r.label}</span>
            <span>{r.value.slice(0, 8)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Approval-state controls
// ---------------------------------------------------------------------------

function ApprovalControls({
  entry,
  services,
  onSubmit,
}: {
  entry: OptimisticEntry;
  services: WithFrontServices["services"];
  onSubmit: Submit;
}) {
  const auth = services.authService.useAuth();
  const userId = rd.tryGet(auth)?.id;
  if (entry.approvalState === "draft") return null;
  const handleRevert = async () => {
    if (!userId) return;
    await onSubmit(
      buildEntryRevertedToDraftPayload(entry.entryId, userId),
      "Reverted to draft",
    );
  };
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={!userId}
      onClick={handleRevert}
      className="gap-1.5"
    >
      <RotateCcw className="size-3.5" />
      Revert to draft
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

function DeleteButton({
  entry,
  disabled,
  onSubmit,
  onClose,
}: {
  entry: OptimisticEntry;
  disabled: boolean;
  onSubmit: Submit;
  onClose: () => void;
}) {
  if (entry.deletedAt !== null) return null;
  const handleDelete = async () => {
    if (!window.confirm("Delete this entry? It will be soft-deleted for audit.")) {
      return;
    }
    const ok = await onSubmit(
      buildEntryDeletedPayload(entry.entryId),
      "Entry deleted",
    );
    if (ok) onClose();
  };
  return (
    <Button
      size="sm"
      variant="destructive"
      disabled={disabled}
      onClick={handleDelete}
      className="gap-1.5"
    >
      <Trash2 className="size-3.5" />
      Delete
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a `Date` to the value format expected by `<input type="datetime-local">`
 * (i.e. `"YYYY-MM-DDTHH:mm"` in the local TZ, no seconds, no offset). The
 * browser then parses the value back with `Date.parse` using the local TZ.
 */
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}
