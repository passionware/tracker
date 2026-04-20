import { Project } from "@/api/project/project.api.ts";
import { projectQueryUtils } from "@/api/project/project.api.ts";
import { Button } from "@/components/ui/button.tsx";
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
  buildEntryStartedPayload,
  newUuid,
} from "@/features/time-tracking/_common/trackerCommands.ts";
import type { ContractorStreamState } from "@/api/time-event/aggregates";
import { rd } from "@passionware/monads";
import { Play } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * Quick-start flow used by the TrackerBar's idle state.
 *
 * Picks a project, optionally a description, and submits an `EntryStarted`
 * event with `isPlaceholder=true`. The user is expected to fill in
 * task/activity later via the EntryEditor (separate todo). Until rate
 * management lands, we use {@link PLACEHOLDER_RATE} as the snapshot — the
 * worker accepts it because the schema still validates; admins can
 * re-snapshot via `EntryRateSnapshotted` once a real rate exists.
 *
 * Pre-flight is delegated to EventQueueService — `rejected_locally` outcomes
 * (concurrent timer running, etc.) are surfaced via toast and the popover
 * stays open so the user can adjust.
 */
export interface TrackerBarStartPopoverProps extends WithFrontServices {
  contractorId: number;
  serverSnapshot: ContractorStreamState | null;
  /**
   * Disabled by the parent when there's already a running primary timer
   * (the bar surfaces a Stop button in that mode instead).
   */
  disabled?: boolean;
}

export function TrackerBarStartPopover(props: TrackerBarStartPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const handleStart = async () => {
    if (selectedProjectId === null) return;
    const project = rd
      .tryGet(projects)
      ?.find((p) => p.id === selectedProjectId);
    if (!project) {
      toast.error("Pick a project first");
      return;
    }
    setSubmitting(true);
    try {
      const envelope = buildContractorEnvelope({
        contractorId: props.contractorId,
        correlationId: newUuid(),
      });
      const payload = buildEntryStartedPayload({
        clientId: project.clientId,
        // Pick the first workspace assignment we know about. Most projects
        // are single-workspace; the EntryEditor lets users re-route later
        // via `EntryRoutingChanged` when this guess is wrong.
        workspaceId: project.workspaceIds[0] ?? 0,
        projectId: project.id,
        rate: PLACEHOLDER_RATE,
        isPlaceholder: true,
        description: description.trim() || undefined,
      });
      const outcome = await props.services.eventQueueService.submitContractorEvent(
        envelope,
        payload,
        { serverSnapshot: props.serverSnapshot },
      );
      if (outcome.kind === "rejected_locally") {
        toast.error(
          `Couldn't start: ${outcome.errors.map((e) => e.message).join("; ")}`,
        );
        return;
      }
      setOpen(false);
      setDescription("");
      toast.success(`Tracking ${project.name}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          className="h-8 gap-1.5 px-3"
          disabled={props.disabled}
        >
          <Play className="size-3.5" />
          Start
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>Start tracking</PopoverHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tracker-bar-project">Project</Label>
            {rd
              .journey(projects)
              .wait(<Skeleton className="h-9 w-full" />)
              .catch(renderError)
              .map((list) => (
                <ProjectSelect
                  projects={list}
                  value={selectedProjectId}
                  onChange={setSelectedProjectId}
                />
              ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tracker-bar-description">
              Description (optional)
            </Label>
            <Textarea
              id="tracker-bar-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you working on?"
            />
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            This starts a placeholder entry — fill in task &amp; activity
            from the entry editor once the timer is running.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleStart}
              disabled={selectedProjectId === null || submitting}
            >
              {submitting ? "Starting…" : "Start timer"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ProjectSelect(props: {
  projects: Project[];
  value: number | null;
  onChange: (next: number | null) => void;
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
      value={props.value === null ? "" : String(props.value)}
      onValueChange={(v) => props.onChange(v === "" ? null : Number(v))}
    >
      <SelectTrigger id="tracker-bar-project" className="h-9 text-sm">
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
