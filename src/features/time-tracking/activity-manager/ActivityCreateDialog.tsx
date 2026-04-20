import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
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
import { Textarea } from "@/components/ui/textarea.tsx";
import type { WithFrontServices } from "@/core/frontServices.ts";
import {
  buildActivityCreatedPayload,
  buildProjectEnvelope,
  KNOWN_ACTIVITY_KINDS,
} from "@/features/time-tracking/_common/projectCommands.ts";
import { newUuid } from "@/features/time-tracking/_common/trackerCommands.ts";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Modal for creating a new activity definition. The project is fixed by the
 * caller (the ActivitiesPage already requires picking a project to render
 * the list, so we don't surface a project picker here).
 */
export interface ActivityCreateDialogProps extends WithFrontServices {
  projectId: number;
}

export function ActivityCreateDialog(props: ActivityCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kinds, setKinds] = useState<string[]>(["development"]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setDescription("");
    setKinds(["development"]);
  };

  const toggle = (kind: string) => {
    setKinds((prev) =>
      prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind],
    );
  };

  const handleSubmit = async () => {
    if (name.trim().length === 0) return;
    setSubmitting(true);
    try {
      const { payload, activityId } = buildActivityCreatedPayload({
        name: name.trim(),
        description: description.trim() || undefined,
        kinds,
      });
      const envelope = buildProjectEnvelope({
        projectId: props.projectId,
        correlationId: newUuid(),
        aggregateKind: "activity",
        aggregateId: activityId,
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="h-8 gap-1.5">
          <Plus className="size-3.5" />
          New activity
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create activity</DialogTitle>
          <DialogDescription>
            Activities classify what kind of work an entry represents — they
            scope the start-timer menu and drive the jump-on quick-row.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="activity-create-name">Name</Label>
            <Input
              id="activity-create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              placeholder="Code review"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="activity-create-description">Description</Label>
            <Textarea
              id="activity-create-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Kinds</Label>
            <ul className="grid grid-cols-2 gap-1.5">
              {KNOWN_ACTIVITY_KINDS.map((k) => (
                <li key={k}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-accent/40">
                    <Checkbox
                      checked={kinds.includes(k)}
                      onCheckedChange={() => toggle(k)}
                    />
                    <span className="font-mono">{k}</span>
                  </label>
                </li>
              ))}
            </ul>
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
            disabled={submitting || name.trim().length === 0}
          >
            {submitting ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
