import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import type { TaskDefinition } from "@/api/task-definition/task-definition.api.ts";
import type {
  ExternalLink,
  ProjectEventPayload,
} from "@/api/time-event/time-event.api.ts";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import type { WithFrontServices } from "@/core/frontServices.ts";
import {
  buildProjectEnvelope,
  buildTaskArchivedPayload,
  buildTaskAssignedPayload,
  buildTaskCompletedPayload,
  buildTaskDescriptionChangedPayload,
  buildTaskEstimateSetPayload,
  buildTaskExternalLinkAddedPayload,
  buildTaskExternalLinkRemovedPayload,
  buildTaskRenamedPayload,
  buildTaskReopenedPayload,
  buildTaskUnarchivedPayload,
  buildTaskUnassignedPayload,
  ESTIMATE_UNITS,
  EXTERNAL_LINK_PROVIDERS,
} from "@/features/time-tracking/_common/projectCommands.ts";
import { AssigneeChips } from "@/features/time-tracking/_common/AssigneeChips.tsx";
import { TaskBurndownSparkline } from "@/features/time-tracking/_common/TaskBurndownSparkline.tsx";
import { newUuid } from "@/features/time-tracking/_common/trackerCommands.ts";
import { formatElapsedSeconds } from "@/features/time-tracking/_common/useElapsedSeconds.ts";
import { rd } from "@passionware/monads";
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  ExternalLink as ExternalLinkIcon,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Drawer for editing one task's metadata. Each save dispatches one project
 * event through `EventQueueService`; the sheet stays open so the user can
 * batch a rename + assignment + estimate change as a single gesture (sharing
 * a `correlationId` so audit replay groups them together).
 *
 * Because the sheet displays the server projection, optimistic updates
 * appear via the normal projection refresh after the worker confirms (the
 * pending-sync pip surfaces inflight events while they're queued).
 */
export interface TaskEditorSheetProps extends WithFrontServices {
  task: TaskDefinition;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskEditorSheet(props: TaskEditorSheetProps) {
  const { task } = props;
  // Each open of the sheet shares one correlationId so all the events fired
  // while the user fiddles in the drawer trace back to one logical edit.
  const [correlationId, setCorrelationId] = useState(() => newUuid());
  useEffect(() => {
    if (props.open) setCorrelationId(newUuid());
  }, [props.open, task.id]);

  const submit = async (
    payload: ProjectEventPayload,
    successMsg: string,
  ) => {
    const envelope = buildProjectEnvelope({
      projectId: task.projectId,
      correlationId,
      aggregateKind: "task",
      aggregateId: task.id,
      expectedAggregateVersion: task.version,
    });
    const outcome = await props.services.eventQueueService.submitProjectEvent(
      envelope,
      payload,
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

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-[32rem] sm:max-w-none">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {task.name}
            {task.completedAt !== null && (
              <Badge tone="secondary" variant="success" size="sm">
                completed
              </Badge>
            )}
            {task.isArchived && (
              <Badge tone="secondary" variant="warning" size="sm">
                archived
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            v{task.version} · last updated{" "}
            {task.updatedAt.toLocaleString()}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-5 overflow-y-auto pr-1">
          <RenameSection task={task} onSubmit={submit} />
          <DescriptionSection task={task} onSubmit={submit} />
          <EstimateSection task={task} onSubmit={submit} />
          <BurndownSection task={task} services={props.services} />
          <AssigneesSection
            task={task}
            onSubmit={submit}
            services={props.services}
          />
          <ExternalLinksSection task={task} onSubmit={submit} />
        </div>

        <SheetFooter className="mt-4 flex-row justify-end gap-2">
          <CompletionButton task={task} services={props.services} onSubmit={submit} />
          <ArchiveButton task={task} onSubmit={submit} />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Sub-sections
// ---------------------------------------------------------------------------

type Submit = (
  payload: ProjectEventPayload,
  successMsg: string,
) => Promise<boolean>;

function RenameSection({
  task,
  onSubmit,
}: {
  task: TaskDefinition;
  onSubmit: Submit;
}) {
  const [name, setName] = useState(task.name);
  useEffect(() => setName(task.name), [task.name]);
  const dirty = name.trim() !== task.name;
  return (
    <section className="flex flex-col gap-1.5">
      <Label htmlFor="task-name">Name</Label>
      <div className="flex items-center gap-2">
        <Input
          id="task-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={!dirty || name.trim().length === 0}
          onClick={() =>
            onSubmit(
              buildTaskRenamedPayload(task.id, name.trim()),
              "Task renamed",
            )
          }
        >
          Save
        </Button>
      </div>
    </section>
  );
}

function DescriptionSection({
  task,
  onSubmit,
}: {
  task: TaskDefinition;
  onSubmit: Submit;
}) {
  const [desc, setDesc] = useState(task.description ?? "");
  useEffect(() => setDesc(task.description ?? ""), [task.description]);
  const trimmed = desc.trim();
  const next = trimmed.length === 0 ? null : trimmed;
  const dirty = next !== (task.description ?? null);
  return (
    <section className="flex flex-col gap-1.5">
      <Label htmlFor="task-description">Description</Label>
      <Textarea
        id="task-description"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        rows={4}
        maxLength={10_000}
        placeholder="Notes that help future-you remember the scope…"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          disabled={!dirty}
          onClick={() =>
            onSubmit(
              buildTaskDescriptionChangedPayload(task.id, next),
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

function EstimateSection({
  task,
  onSubmit,
}: {
  task: TaskDefinition;
  onSubmit: Submit;
}) {
  const [quantity, setQuantity] = useState<string>(
    task.estimateQuantity?.toString() ?? "",
  );
  const [unit, setUnit] = useState<string>(task.estimateUnit ?? "h");
  useEffect(() => {
    setQuantity(task.estimateQuantity?.toString() ?? "");
    setUnit(task.estimateUnit ?? "h");
  }, [task.estimateQuantity, task.estimateUnit]);

  const parsed = quantity.trim() === "" ? null : Number(quantity);
  const isValid =
    parsed === null ||
    (Number.isFinite(parsed) && parsed >= 0 && unit.trim().length > 0);
  const next =
    parsed === null ? null : { quantity: parsed, unit: unit.trim() };
  const current =
    task.estimateQuantity !== null && task.estimateUnit !== null
      ? { quantity: task.estimateQuantity, unit: task.estimateUnit }
      : null;
  const dirty =
    JSON.stringify(next ?? null) !== JSON.stringify(current ?? null);

  return (
    <section className="flex flex-col gap-1.5">
      <Label>Estimate</Label>
      <div className="flex items-center gap-2">
        <Input
          inputMode="decimal"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="e.g. 4"
          className="max-w-32"
        />
        <Select value={unit} onValueChange={setUnit}>
          <SelectTrigger className="max-w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ESTIMATE_UNITS.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          disabled={!dirty || !isValid}
          onClick={() =>
            onSubmit(
              buildTaskEstimateSetPayload(task.id, next),
              next === null ? "Estimate cleared" : "Estimate saved",
            )
          }
        >
          Save
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Used for the % over estimate badge on the Tasks page. Leave blank to
        clear.
      </p>
    </section>
  );
}

function AssigneesSection({
  task,
  onSubmit,
  services,
}: {
  task: TaskDefinition;
  onSubmit: Submit;
} & WithFrontServices) {
  // "Assign me" needs a concrete contractor id. Prefer the auth-user ↔
  // contractor mapping (admin-set), fall back to the tracker-bar "track
  // as" override when no mapping exists yet — keeps the button usable
  // for unpaired dev accounts without silently pretending the override
  // is the user's identity.
  const authInfo = rd.tryGet(services.authService.useAuth());
  const myContractor = rd.tryGet(
    services.contractorService.useMyContractor(authInfo?.id ?? null),
  );
  const trackerContractorId =
    services.preferenceService.useTrackerActiveContractorId();
  const currentContractorId = myContractor?.id ?? trackerContractorId;
  const contractors = services.contractorService.useContractors(
    contractorQueryUtils.ofEmpty(),
  );
  const contractorList = rd.tryGet(contractors) ?? [];
  const contractorById = new Map(contractorList.map((c) => [c.id, c]));
  const [picked, setPicked] = useState<string>("");

  const pickedId = picked === "" ? null : Number(picked);
  const canAdd =
    pickedId !== null &&
    Number.isFinite(pickedId) &&
    !task.assignees.includes(pickedId);

  const handleAssign = async () => {
    if (pickedId === null || !canAdd) return;
    const ok = await onSubmit(
      buildTaskAssignedPayload(task.id, pickedId),
      "Assigned",
    );
    if (ok) setPicked("");
  };

  const isAssignedToMe =
    currentContractorId !== null && task.assignees.includes(currentContractorId);

  const assignable = contractorList.filter(
    (c) => !task.assignees.includes(c.id),
  );

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label>Assignees</Label>
        {currentContractorId !== null ? (
          isAssignedToMe ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[11px]"
              onClick={() =>
                onSubmit(
                  buildTaskUnassignedPayload(task.id, currentContractorId),
                  "Unassigned yourself",
                )
              }
            >
              Unassign me
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[11px]"
              onClick={() =>
                onSubmit(
                  buildTaskAssignedPayload(task.id, currentContractorId),
                  "Assigned to you",
                )
              }
            >
              Assign me
            </Button>
          )
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <AssigneeChips
          services={services}
          assignees={task.assignees}
          currentContractorId={currentContractorId}
          maxVisible={6}
        />
      </div>
      {task.assignees.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border rounded-md border">
          {task.assignees.map((contractorId) => {
            const c = contractorById.get(contractorId);
            return (
              <li
                key={contractorId}
                className="flex items-center justify-between gap-2 px-2 py-1 text-xs"
              >
                <span>
                  {c?.fullName ?? `Contractor #${contractorId}`}
                  {contractorId === currentContractorId ? (
                    <span className="ml-1 text-emerald-700">· you</span>
                  ) : null}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[11px]"
                  onClick={() =>
                    onSubmit(
                      buildTaskUnassignedPayload(task.id, contractorId),
                      "Unassigned",
                    )
                  }
                >
                  <X className="size-3" />
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          Unassigned — every contractor sees this task in their picker.
        </p>
      )}
      <div className="flex items-center gap-2">
        <Select value={picked} onValueChange={setPicked}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Pick a contractor…" />
          </SelectTrigger>
          <SelectContent>
            {assignable.length === 0 ? (
              <div className="px-2 py-1 text-xs text-muted-foreground">
                All known contractors are already assigned.
              </div>
            ) : (
              assignable.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.fullName}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          disabled={!canAdd}
          onClick={handleAssign}
        >
          Add
        </Button>
      </div>
    </section>
  );
}

function ExternalLinksSection({
  task,
  onSubmit,
}: {
  task: TaskDefinition;
  onSubmit: Submit;
}) {
  const [provider, setProvider] = useState<ExternalLink["provider"]>("linear");
  const [externalId, setExternalId] = useState("");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const canAdd =
    externalId.trim().length > 0 && /^https?:\/\//.test(url.trim());

  const handleAdd = async () => {
    const link: ExternalLink = {
      provider,
      externalId: externalId.trim(),
      url: url.trim(),
      label: label.trim().length > 0 ? label.trim() : undefined,
    };
    const ok = await onSubmit(
      buildTaskExternalLinkAddedPayload(task.id, link),
      "Link added",
    );
    if (ok) {
      setExternalId("");
      setUrl("");
      setLabel("");
    }
  };

  return (
    <section className="flex flex-col gap-1.5">
      <Label>External links</Label>
      <ul className="flex flex-col gap-1">
        {task.externalLinks.length === 0 && (
          <li className="text-xs text-muted-foreground">
            None yet — link a Linear ticket / GitLab MR / branch to enrich
            timeline tooltips.
          </li>
        )}
        {task.externalLinks.map((l) => (
          <li
            key={`${l.provider}:${l.externalId}`}
            className="flex items-center justify-between rounded-md border px-2 py-1"
          >
            <div className="flex items-center gap-2 text-xs">
              <Badge tone="secondary" variant="neutral" className="uppercase">
                {l.provider}
              </Badge>
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline"
              >
                {l.label ?? l.externalId}
                <ExternalLinkIcon className="size-3" />
              </a>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() =>
                    onSubmit(
                      buildTaskExternalLinkRemovedPayload(
                        task.id,
                        l.provider,
                        l.externalId,
                      ),
                      "Link removed",
                    )
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove link</TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-[6rem_1fr] gap-1.5">
        <Select
          value={provider}
          onValueChange={(v) => setProvider(v as ExternalLink["provider"])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXTERNAL_LINK_PROVIDERS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={externalId}
          onChange={(e) => setExternalId(e.target.value)}
          placeholder="ID or branch (e.g. ENG-123)"
        />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="col-span-2"
        />
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optional)"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={!canAdd}
          onClick={handleAdd}
        >
          Add link
        </Button>
      </div>
    </section>
  );
}

function CompletionButton({
  task,
  services,
  onSubmit,
}: {
  task: TaskDefinition;
  services: WithFrontServices["services"];
  onSubmit: Submit;
}) {
  const auth = services.authService.useAuth();
  const userId = rd.tryGet(auth)?.id;
  if (task.isArchived) return null;
  if (task.completedAt === null) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={userId === undefined}
        onClick={() =>
          userId &&
          onSubmit(buildTaskCompletedPayload(task.id, userId), "Marked complete")
        }
        className="gap-1.5"
      >
        <CheckCircle2 className="size-3.5" />
        Mark complete
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={userId === undefined}
      onClick={() =>
        userId &&
        onSubmit(buildTaskReopenedPayload(task.id, userId), "Reopened")
      }
      className="gap-1.5"
    >
      <RotateCcw className="size-3.5" />
      Reopen
    </Button>
  );
}

function ArchiveButton({
  task,
  onSubmit,
}: {
  task: TaskDefinition;
  onSubmit: Submit;
}) {
  if (task.isArchived) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          onSubmit(buildTaskUnarchivedPayload(task.id), "Unarchived")
        }
        className="gap-1.5"
      >
        <ArchiveRestore className="size-3.5" />
        Unarchive
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      variant="destructive"
      onClick={() => onSubmit(buildTaskArchivedPayload(task.id), "Archived")}
      className="gap-1.5"
    >
      <Archive className="size-3.5" />
      Archive
    </Button>
  );
}

function BurndownSection({
  task,
  services,
}: {
  task: TaskDefinition;
} & WithFrontServices) {
  const taskIds = [task.id];
  const burndown = services.taskDefinitionService.useTaskBurndownSeries(
    taskIds,
    30,
  );
  const series = rd.tryGet(burndown)?.get(task.id) ?? [];
  const estimateSeconds = estimateToSeconds(task);
  const lastPoint = series.length > 0 ? series[series.length - 1]! : null;
  const overage =
    estimateSeconds !== null &&
    estimateSeconds > 0 &&
    lastPoint !== null
      ? lastPoint.cumulativeSeconds / estimateSeconds
      : null;

  return (
    <section className="flex flex-col gap-1.5">
      <Label>30-day burn-up</Label>
      <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-2">
        <TaskBurndownSparkline
          points={series}
          estimateSeconds={estimateSeconds}
          width={180}
          height={40}
        />
        <div className="flex flex-col text-xs tabular-nums">
          <span className="font-medium">
            {lastPoint !== null
              ? formatElapsedSeconds(lastPoint.cumulativeSeconds)
              : "0h"}
          </span>
          <span className="text-muted-foreground">
            {estimateSeconds !== null
              ? `of ${formatElapsedSeconds(estimateSeconds)}`
              : "no estimate"}
          </span>
          {overage !== null ? (
            <span
              className={
                overage > 1.1
                  ? "text-red-600"
                  : overage > 0.85
                    ? "text-amber-600"
                    : "text-emerald-700"
              }
            >
              {Math.round(overage * 100)}%
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function estimateToSeconds(task: TaskDefinition): number | null {
  if (task.estimateQuantity === null) return null;
  switch ((task.estimateUnit ?? "h").toLowerCase()) {
    case "h":
    case "hour":
    case "hours":
      return task.estimateQuantity * 3600;
    case "m":
    case "min":
    case "mins":
    case "minute":
    case "minutes":
      return task.estimateQuantity * 60;
    case "d":
    case "day":
    case "days":
      return task.estimateQuantity * 8 * 3600;
    default:
      return null;
  }
}
