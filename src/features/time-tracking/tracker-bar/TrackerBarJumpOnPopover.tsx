import type { Activity } from "@/api/activity/activity.api.ts";
import type { Project } from "@/api/project/project.api.ts";
import { projectQueryUtils } from "@/api/project/project.api.ts";
import type {
  ContractorStreamState,
  EntryState,
} from "@/api/time-event/aggregates";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import type { WithFrontServices } from "@/core/frontServices.ts";
import { renderError } from "@/features/_common/renderError.tsx";
import {
  PLACEHOLDER_RATE,
  buildContractorEnvelope,
  buildEntryActivityAssignedPayload,
  buildEntryStartedPayload,
  newUuid,
} from "@/features/time-tracking/_common/trackerCommands.ts";
import { rd } from "@passionware/monads";
import { Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * "Jump on…" flow — starts a side-quest entry that runs in parallel with
 * the primary timer (the primary is NOT stopped; the validator enforces
 * the one-running-jump-on-per-contractor invariant).
 *
 * Project defaults to the primary entry's project so "quick help on a
 * teammate's PR in the same codebase" is one click. The activity picker
 * filters to `kinds @> {jump_on}` by default — that's the whole point of
 * the `jump_on` kind tag on activities: it lets us surface a curated
 * short-list (e.g. "Code review", "Pairing", "Quick help") instead of
 * the full project activity catalogue. A "show all" toggle is available
 * for projects that haven't classified their activities yet.
 *
 * Submission is a two-event gesture sharing a `correlationId`:
 *   1. `EntryStarted` (placeholder, interruptedEntryId = primary.entryId)
 *   2. `EntryActivityAssigned` (only when an activity was picked)
 *
 * Keeping step (2) optional means a user can start a jump-on immediately
 * with just a description and classify it later via the EntryEditor.
 */
export interface TrackerBarJumpOnPopoverProps extends WithFrontServices {
  contractorId: number;
  primaryEntry: EntryState;
  serverSnapshot: ContractorStreamState;
}

export function TrackerBarJumpOnPopover(props: TrackerBarJumpOnPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number>(
    props.primaryEntry.projectId,
  );
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null,
  );
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset transient selections whenever the popover closes so the next
  // open starts fresh against the *current* primary (otherwise a user
  // who cancels, stops, and re-starts a different primary would see
  // stale state).
  useEffect(() => {
    if (!open) {
      setSelectedProjectId(props.primaryEntry.projectId);
      setSelectedActivityId(null);
      setShowAllActivities(false);
      setDescription("");
    }
  }, [open, props.primaryEntry.projectId]);

  const projects = props.services.projectService.useProjects(
    useMemo(
      () =>
        projectQueryUtils
          .transform(projectQueryUtils.ofDefault())
          .build((x) => [
            x.withFilter("status", { operator: "oneOf", value: ["active"] }),
          ]),
      [],
    ),
  );

  const activitiesQuery = useMemo(
    () => ({
      projectId: selectedProjectId,
      kind: showAllActivities ? undefined : "jump_on",
      limit: 50,
    }),
    [selectedProjectId, showAllActivities],
  );
  const activities =
    props.services.activityService.useActivities(activitiesQuery);

  // If the current activity choice no longer belongs to the freshly
  // filtered list (project change, or "show all" toggle hiding the old
  // list), clear it so the Start button isn't wedged on a stale id.
  useEffect(() => {
    const list = rd.tryGet(activities);
    if (!list || selectedActivityId === null) return;
    if (!list.some((a) => a.id === selectedActivityId)) {
      setSelectedActivityId(null);
    }
  }, [activities, selectedActivityId]);

  const handleStart = async () => {
    const project = rd
      .tryGet(projects)
      ?.find((p) => p.id === selectedProjectId);
    if (!project) {
      toast.error("Pick a project first");
      return;
    }
    const chosenActivity = selectedActivityId
      ? rd.tryGet(activities)?.find((a) => a.id === selectedActivityId)
      : null;

    setSubmitting(true);
    try {
      // Both events share a correlationId so audit replay shows them as
      // one UI gesture. The queue will submit them in order; the
      // optimistic fold applies them sequentially for the UI.
      const correlationId = newUuid();
      const startEnvelope = buildContractorEnvelope({
        contractorId: props.contractorId,
        correlationId,
      });
      const jumpOnEntryId = newUuid();
      const startPayload = buildEntryStartedPayload({
        entryId: jumpOnEntryId,
        clientId: project.clientId,
        workspaceId: project.workspaceIds[0] ?? 0,
        projectId: project.id,
        rate: PLACEHOLDER_RATE,
        isPlaceholder: true,
        description: description.trim() || undefined,
        interruptedEntryId: props.primaryEntry.entryId,
      });

      const startOutcome =
        await props.services.eventQueueService.submitContractorEvent(
          startEnvelope,
          startPayload,
          { serverSnapshot: props.serverSnapshot },
        );
      if (startOutcome.kind === "rejected_locally") {
        toast.error(
          `Couldn't jump on: ${startOutcome.errors
            .map((e) => e.message)
            .join("; ")}`,
        );
        return;
      }

      if (chosenActivity) {
        // EntryActivityAssigned doesn't require a task, so it's safe to
        // tag the placeholder with the chosen jump_on activity. The
        // projection keeps `is_placeholder = true` until a task is
        // added later (see contractor-stream reducer).
        const tagEnvelope = buildContractorEnvelope({
          contractorId: props.contractorId,
          correlationId,
        });
        const tagPayload = buildEntryActivityAssignedPayload(jumpOnEntryId, {
          activityId: chosenActivity.id,
          activityVersion: chosenActivity.version,
        });
        const tagOutcome =
          await props.services.eventQueueService.submitContractorEvent(
            tagEnvelope,
            tagPayload,
            { serverSnapshot: props.serverSnapshot },
          );
        if (tagOutcome.kind === "rejected_locally") {
          // The entry exists (start succeeded); just surface a non-fatal
          // warning so the user can re-tag from the editor.
          toast.warning(
            `Started — but couldn't tag activity: ${tagOutcome.errors
              .map((e) => e.message)
              .join("; ")}`,
          );
        }
      }

      setOpen(false);
      toast.success(
        chosenActivity
          ? `Jumped on ${project.name} (${chosenActivity.name})`
          : `Jumped on ${project.name}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 px-2 text-amber-900 border-amber-300 bg-amber-50 hover:bg-amber-100"
        >
          <Zap className="size-3.5" />
          Jump on
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>Jump on a side task</PopoverHeader>
        <div className="flex flex-col gap-3">
          <p className="text-[11px] leading-snug text-muted-foreground">
            Your primary timer keeps running. Stopping this side-quest
            returns you to it.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tracker-bar-jumpon-project">Project</Label>
            {rd
              .journey(projects)
              .wait(<Skeleton className="h-9 w-full" />)
              .catch(renderError)
              .map((list) => (
                <ProjectSelect
                  projects={list}
                  value={selectedProjectId}
                  onChange={(next) => {
                    setSelectedProjectId(next);
                    setSelectedActivityId(null);
                  }}
                />
              ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="tracker-bar-jumpon-activity">Activity</Label>
              <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
                <Checkbox
                  checked={showAllActivities}
                  onCheckedChange={(v) => setShowAllActivities(v === true)}
                />
                Show all
              </label>
            </div>
            {rd
              .journey(activities)
              .wait(<Skeleton className="h-9 w-full" />)
              .catch(renderError)
              .map((list) => (
                <ActivitySelect
                  activities={list}
                  value={selectedActivityId}
                  onChange={setSelectedActivityId}
                  emptyHint={
                    showAllActivities
                      ? "No activities for this project yet."
                      : "No jump-on activities — toggle Show all."
                  }
                />
              ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tracker-bar-jumpon-description">
              Description (optional)
            </Label>
            <Textarea
              id="tracker-bar-jumpon-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. helping Ada with the billing bug"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleStart} disabled={submitting}>
              {submitting ? "Starting…" : "Jump on"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ProjectSelect(props: {
  projects: Project[];
  value: number;
  onChange: (next: number) => void;
}) {
  const sorted = useMemo(
    () => [...props.projects].sort((a, b) => a.name.localeCompare(b.name)),
    [props.projects],
  );
  if (sorted.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        No active projects in scope.
      </div>
    );
  }
  return (
    <Select
      value={String(props.value)}
      onValueChange={(v) => props.onChange(Number(v))}
    >
      <SelectTrigger id="tracker-bar-jumpon-project" className="h-9 text-sm">
        <SelectValue placeholder="Pick a project…" />
      </SelectTrigger>
      <SelectContent>
        {sorted.map((p) => (
          <SelectItem key={p.id} value={String(p.id)}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ActivitySelect(props: {
  activities: Activity[];
  value: string | null;
  onChange: (next: string | null) => void;
  emptyHint: string;
}) {
  const sorted = useMemo(
    () =>
      [...props.activities].sort((a, b) => a.name.localeCompare(b.name)),
    [props.activities],
  );
  if (sorted.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">{props.emptyHint}</div>
    );
  }
  return (
    <Select
      value={props.value ?? ""}
      onValueChange={(v) => props.onChange(v === "" ? null : v)}
    >
      <SelectTrigger id="tracker-bar-jumpon-activity" className="h-9 text-sm">
        <SelectValue placeholder="Pick an activity (optional)…" />
      </SelectTrigger>
      <SelectContent>
        {sorted.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.name}
            {a.kinds.length > 0 && (
              <span className="ml-2 text-[10px] text-muted-foreground">
                {a.kinds.join(", ")}
              </span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
