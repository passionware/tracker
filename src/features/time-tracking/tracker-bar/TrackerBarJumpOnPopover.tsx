import type { Activity } from "@/api/activity/activity.api.ts";
import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import type {
  ContractorStreamState,
  EntryState,
} from "@/api/time-event/aggregates";
import type { TimeEntry } from "@/api/time-entry/time-entry.api.ts";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
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
import type { WithFrontServices } from "@/core/frontServices.ts";
import { renderError } from "@/features/_common/renderError.tsx";
import {
  PLACEHOLDER_RATE,
  buildContractorEnvelope,
  buildEntryActivityAssignedPayload,
  buildEntryStartedPayload,
  newUuid,
} from "@/features/time-tracking/_common/trackerCommands.ts";
import { rd, type RemoteData } from "@passionware/monads";
import { Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * "Jump on" flow, teammate-first: show the contractors who are currently
 * tracking time, let the user pick one, then start a side-quest entry on
 * that teammate's project tagged with a `jump_on` activity.
 *
 * Activity resolution:
 *   - 0 jump_on activities on the project → fall back to a plain
 *     placeholder start (still links `interruptedEntryId`).
 *   - 1 jump_on activity → auto-pick it, no extra click.
 *   - 2+ → inline selector, first one preselected.
 *
 * Submission is the same two-event gesture as the start flow: an
 * `EntryStarted` (placeholder, with `interruptedEntryId = primary.entryId`
 * and the teammate's projectId / clientId / workspaceId) followed by an
 * optional `EntryActivityAssigned`. Both share one `correlationId` so
 * audit replay shows them as a single UI gesture.
 */
export interface TrackerBarJumpOnPopoverProps extends WithFrontServices {
  contractorId: number;
  primaryEntry: EntryState;
  serverSnapshot: ContractorStreamState;
}

export function TrackerBarJumpOnPopover(props: TrackerBarJumpOnPopoverProps) {
  const [open, setOpen] = useState(false);

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
        <PopoverHeader>Jump on a teammate</PopoverHeader>
        <div className="flex flex-col gap-2">
          <p className="text-[11px] leading-snug text-muted-foreground">
            Your primary timer keeps running. Stopping this side-quest
            returns you to it.
          </p>
          {open ? (
            <TeammateList {...props} onDone={() => setOpen(false)} />
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TeammateList(
  props: TrackerBarJumpOnPopoverProps & { onDone: () => void },
) {
  const activeEntriesQuery = useMemo(
    () => ({ onlyActive: true, limit: 50 }),
    [],
  );
  const activeEntries =
    props.services.timeEntryService.useEntries(activeEntriesQuery);
  const contractors = props.services.contractorService.useContractors(
    useMemo(() => contractorQueryUtils.ofEmpty(), []),
  );

  return rd
    .journey(rd.combine({ entries: activeEntries, contractors }))
    .wait(<TeammateListSkeleton />)
    .catch(renderError)
    .map(({ entries, contractors }) => {
      // Exclude the caller's own running timer — jump-on is a "side quest
      // with someone else". Also skip entries that don't reference a real
      // teammate row (shouldn't normally happen, defensive).
      const teammates = entries
        .filter((e) => e.contractorId !== props.contractorId)
        .map((e) => ({
          entry: e,
          contractor: contractors.find((c) => c.id === e.contractorId),
        }))
        .filter(
          (x): x is { entry: TimeEntry; contractor: NonNullable<typeof x.contractor> } =>
            !!x.contractor,
        );

      if (teammates.length === 0) {
        return (
          <div className="rounded border border-dashed border-border/60 bg-muted/40 px-3 py-2 text-center text-xs text-muted-foreground">
            No teammates are tracking right now.
          </div>
        );
      }

      return (
        <ul className="flex flex-col gap-1">
          {teammates.map(({ entry, contractor }) => (
            <li key={entry.id}>
              <TeammateRow
                services={props.services}
                contractorId={props.contractorId}
                primaryEntry={props.primaryEntry}
                serverSnapshot={props.serverSnapshot}
                teammate={contractor}
                teammateEntry={entry}
                onDone={props.onDone}
              />
            </li>
          ))}
        </ul>
      );
    });
}

function TeammateListSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

interface TeammateRowProps extends WithFrontServices {
  contractorId: number;
  primaryEntry: EntryState;
  serverSnapshot: ContractorStreamState;
  teammate: { id: number; fullName: string; name: string };
  teammateEntry: TimeEntry;
  onDone: () => void;
}

function TeammateRow(props: TeammateRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null,
  );

  const activities = props.services.activityService.useActivities(
    useMemo(
      () => ({
        projectId: props.teammateEntry.projectId,
        kind: "jump_on",
        limit: 20,
      }),
      [props.teammateEntry.projectId],
    ),
  );

  const project = props.services.projectService.useProject(
    props.teammateEntry.projectId,
  );
  const projectName =
    rd.tryGet(project)?.name ?? `Project ${props.teammateEntry.projectId}`;
  const initials = (props.teammate.fullName ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const handleStart = async (activity: Activity | null) => {
    setSubmitting(true);
    try {
      const correlationId = newUuid();
      const jumpOnEntryId = newUuid();
      const startEnvelope = buildContractorEnvelope({
        contractorId: props.contractorId,
        correlationId,
      });
      // Use the teammate's routing verbatim — that's the whole point of
      // "jump on": I'm joining their project. The EntryEditor still lets
      // me re-route later via EntryRoutingChanged if the guess is wrong.
      const startPayload = buildEntryStartedPayload({
        entryId: jumpOnEntryId,
        clientId: props.teammateEntry.clientId,
        workspaceId: props.teammateEntry.workspaceId,
        projectId: props.teammateEntry.projectId,
        rate: PLACEHOLDER_RATE,
        isPlaceholder: true,
        description: `Jumping on ${props.teammate.fullName}`,
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

      if (activity) {
        const tagEnvelope = buildContractorEnvelope({
          contractorId: props.contractorId,
          correlationId,
        });
        const tagPayload = buildEntryActivityAssignedPayload(jumpOnEntryId, {
          activityId: activity.id,
          activityVersion: activity.version,
        });
        const tagOutcome =
          await props.services.eventQueueService.submitContractorEvent(
            tagEnvelope,
            tagPayload,
            { serverSnapshot: props.serverSnapshot },
          );
        if (tagOutcome.kind === "rejected_locally") {
          toast.warning(
            `Started — but couldn't tag activity: ${tagOutcome.errors
              .map((e) => e.message)
              .join("; ")}`,
          );
        }
      }
      toast.success(
        activity
          ? `Jumped on ${props.teammate.fullName} (${activity.name})`
          : `Jumped on ${props.teammate.fullName}`,
      );
      props.onDone();
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-start path: one jump_on activity = zero friction. Wrapped in a
  // click handler rather than an effect to preserve user intent (the user
  // must physically press the row). If the activity list is still
  // loading, we fall back to the "select activity" path the moment it
  // resolves.
  const onRowClick = async () => {
    if (submitting) return;
    const list = rd.tryGet(activities);
    if (list === undefined) {
      // Still loading — surface the expanded state so the user sees why
      // nothing happened. The list skeleton will appear inline.
      setExpanded(true);
      return;
    }
    if (list.length === 0) {
      // No jump_on activities — start with a bare placeholder so the
      // user can still classify "I'm helping teammate X" later via the
      // editor sheet.
      await handleStart(null);
      return;
    }
    if (list.length === 1) {
      await handleStart(list[0]);
      return;
    }
    // Multiple → show the inline selector, preselect the first.
    setSelectedActivityId((prev) => prev ?? list[0].id);
    setExpanded(true);
  };

  return (
    <div className="rounded-md border border-border/60 bg-background hover:border-amber-300">
      <button
        type="button"
        onClick={onRowClick}
        disabled={submitting}
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left disabled:opacity-60"
      >
        <Avatar className="size-7 shrink-0">
          <AvatarImage alt="" />
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">
            {props.teammate.fullName}
          </span>
          <span className="truncate text-[11px] text-muted-foreground">
            {props.teammateEntry.description?.trim()
              ? props.teammateEntry.description
              : projectName}
          </span>
        </div>
        <Zap className="size-3.5 text-amber-600" />
      </button>
      {expanded ? (
        <ExpandedPicker
          activities={activities}
          selectedActivityId={selectedActivityId}
          onChange={setSelectedActivityId}
          submitting={submitting}
          onCancel={() => setExpanded(false)}
          onConfirm={async () => {
            const list = rd.tryGet(activities);
            if (!list || list.length === 0) {
              await handleStart(null);
              return;
            }
            const chosen =
              list.find((a) => a.id === selectedActivityId) ?? list[0];
            await handleStart(chosen);
          }}
        />
      ) : null}
    </div>
  );
}

function ExpandedPicker(props: {
  activities: RemoteData<Activity[]>;
  selectedActivityId: string | null;
  onChange: (id: string | null) => void;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  return (
    <div className="border-t border-border/60 px-2 py-1.5">
      {rd
        .journey(props.activities)
        .wait(<Skeleton className="h-8 w-full" />)
        .catch(renderError)
        .map((list) => {
          if (list.length === 0) {
            return (
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                No jump-on activities configured for this project — will
                start as a bare placeholder.
                <Button
                  size="sm"
                  onClick={() => props.onConfirm()}
                  disabled={props.submitting}
                >
                  Start
                </Button>
              </div>
            );
          }
          const sorted = [...list].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
          return (
            <div className="flex items-center gap-2">
              <Select
                value={props.selectedActivityId ?? sorted[0].id}
                onValueChange={(v) => props.onChange(v)}
              >
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sorted.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="ghost"
                onClick={props.onCancel}
                disabled={props.submitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => props.onConfirm()}
                disabled={props.submitting}
              >
                {props.submitting ? "Starting…" : "Start"}
              </Button>
            </div>
          );
        })}
    </div>
  );
}
