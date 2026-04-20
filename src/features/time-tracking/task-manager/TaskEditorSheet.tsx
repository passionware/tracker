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
import { newUuid } from "@/features/time-tracking/_common/trackerCommands.ts";
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
          <AssigneesSection task={task} onSubmit={submit} />
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
}: {
  task: TaskDefinition;
  onSubmit: Submit;
}) {
  // Until we wire a contractor → auth.users mapping, the picker accepts a
  // raw Supabase auth UUID. The task page footer already shows assignee
  // chips so admins can verify what they pasted is correct.
  const [pickedUuid, setPickedUuid] = useState("");
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    pickedUuid.trim(),
  );
  const handleAssign = async () => {
    if (!isUuid) return;
    const ok = await onSubmit(
      buildTaskAssignedPayload(task.id, pickedUuid.trim()),
      "Assigned",
    );
    if (ok) setPickedUuid("");
  };

  return (
    <section className="flex flex-col gap-1.5">
      <Label>Assignees</Label>
      <div className="flex flex-wrap gap-1">
        {task.assignees.length === 0 && (
          <span className="text-xs text-muted-foreground">
            Unassigned — every contractor sees this task in their picker.
          </span>
        )}
        {task.assignees.map((authUserId) => (
          <Badge
            key={authUserId}
            tone="secondary"
            variant="neutral"
            className="gap-1 pr-1"
          >
            <span className="font-mono text-[10px]">
              {authUserId.slice(0, 8)}
            </span>
            <button
              type="button"
              aria-label="Unassign"
              className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
              onClick={() =>
                onSubmit(
                  buildTaskUnassignedPayload(task.id, authUserId),
                  "Unassigned",
                )
              }
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={pickedUuid}
          onChange={(e) => setPickedUuid(e.target.value)}
          placeholder="auth.users.id (UUID)"
          className="font-mono text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={!isUuid || task.assignees.includes(pickedUuid.trim())}
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
