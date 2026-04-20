import type { Project } from "@/api/project/project.api.ts";
import { projectQueryUtils } from "@/api/project/project.api.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea.tsx";
import type { WithFrontServices } from "@/core/frontServices.ts";
import { renderError } from "@/features/_common/renderError.tsx";
import {
  buildProjectEnvelope,
  buildTaskCreatedPayload,
  ESTIMATE_UNITS,
} from "@/features/time-tracking/_common/projectCommands.ts";
import { newUuid } from "@/features/time-tracking/_common/trackerCommands.ts";
import type { ClientSpec, WorkspaceSpec } from "@/routing/routingUtils.ts";
import { rd } from "@passionware/monads";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * Modal for creating a new task. Project picker is scoped to the active
 * workspace + client so admins don't accidentally drop a task into the
 * wrong tenant. Estimate is optional; everything else can be edited later
 * via the {@link TaskEditorSheet}.
 */
export interface TaskCreateDialogProps extends WithFrontServices {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  /** Pre-fills the project picker; overridable. */
  defaultProjectId?: number;
}

export function TaskCreateDialog(props: TaskCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState<number | null>(
    props.defaultProjectId ?? null,
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [estimateQty, setEstimateQty] = useState("");
  const [estimateUnit, setEstimateUnit] = useState<string>("h");
  const [submitting, setSubmitting] = useState(false);

  const projectsQuery = useMemo(
    () =>
      projectQueryUtils
        .transform(
          projectQueryUtils.ensureDefault(projectQueryUtils.ofDefault(), {
            workspaceId: props.workspaceId,
            clientId: props.clientId,
          }),
        )
        .build((x) => [
          x.withFilter("status", { operator: "oneOf", value: ["active"] }),
        ]),
    [props.workspaceId, props.clientId],
  );
  const projects = props.services.projectService.useProjects(projectsQuery);

  const reset = () => {
    setName("");
    setDescription("");
    setEstimateQty("");
    setEstimateUnit("h");
    setProjectId(props.defaultProjectId ?? null);
  };

  const handleSubmit = async () => {
    if (projectId === null || name.trim().length === 0) return;
    const project = rd.tryGet(projects)?.find((p) => p.id === projectId);
    if (!project) {
      toast.error("Pick a project first");
      return;
    }
    const qtyParsed = estimateQty.trim() === "" ? null : Number(estimateQty);
    const estimate =
      qtyParsed === null
        ? undefined
        : Number.isFinite(qtyParsed) && qtyParsed >= 0
          ? { quantity: qtyParsed, unit: estimateUnit }
          : undefined;

    setSubmitting(true);
    try {
      const { payload, taskId } = buildTaskCreatedPayload({
        clientId: project.clientId,
        name: name.trim(),
        description: description.trim() || undefined,
        estimate,
      });
      const envelope = buildProjectEnvelope({
        projectId,
        correlationId: newUuid(),
        aggregateKind: "task",
        aggregateId: taskId,
      });
      const outcome =
        await props.services.eventQueueService.submitProjectEvent(
          envelope,
          payload,
        );
      if (outcome.kind === "rejected_locally") {
        toast.error(
          `Couldn't create: ${outcome.errors.map((e) => e.message).join("; ")}`,
        );
        return;
      }
      toast.success(`Created “${name.trim()}”`);
      setOpen(false);
      reset();
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-pick the only project so a single-project tenant doesn't have to
  // touch the picker.
  const projectsList = rd.tryGet(projects) ?? [];
  if (
    projectId === null &&
    projectsList.length === 1 &&
    props.defaultProjectId === undefined
  ) {
    queueMicrotask(() => setProjectId(projectsList[0].id));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="h-8 gap-1.5">
          <Plus className="size-3.5" />
          New task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Tasks live in the project event stream. They can be renamed,
            assigned, and given an estimate later from the editor.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-create-project">Project</Label>
            {rd
              .journey(projects)
              .wait(<Skeleton className="h-9 w-full" />)
              .catch(renderError)
              .map((list) => (
                <ProjectSelect
                  projects={list}
                  value={projectId}
                  onChange={setProjectId}
                />
              ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-create-name">Name</Label>
            <Input
              id="task-create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              placeholder="Implement webhook retries"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-create-description">Description</Label>
            <Textarea
              id="task-create-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={10_000}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Estimate (optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                inputMode="decimal"
                value={estimateQty}
                onChange={(e) => setEstimateQty(e.target.value)}
                placeholder="e.g. 4"
                className="max-w-32"
              />
              <Select value={estimateUnit} onValueChange={setEstimateUnit}>
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
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              setOpen(false);
              reset();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting || projectId === null || name.trim().length === 0
            }
          >
            {submitting ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectSelect(props: {
  projects: Project[];
  value: number | null;
  onChange: (next: number) => void;
}) {
  if (props.projects.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No active projects in this scope.
      </p>
    );
  }
  return (
    <Select
      value={props.value?.toString() ?? ""}
      onValueChange={(v) => props.onChange(Number(v))}
    >
      <SelectTrigger>
        <SelectValue placeholder="Pick a project…" />
      </SelectTrigger>
      <SelectContent>
        {props.projects.map((p) => (
          <SelectItem key={p.id} value={p.id.toString()}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
