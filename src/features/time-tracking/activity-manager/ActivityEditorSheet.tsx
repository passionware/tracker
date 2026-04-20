import type { Activity } from "@/api/activity/activity.api.ts";
import type { ProjectEventPayload } from "@/api/time-event/time-event.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
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
import {
  buildActivityArchivedPayload,
  buildActivityDescriptionChangedPayload,
  buildActivityKindsChangedPayload,
  buildActivityRenamedPayload,
  buildActivityUnarchivedPayload,
  buildProjectEnvelope,
  KNOWN_ACTIVITY_KINDS,
} from "@/features/time-tracking/_common/projectCommands.ts";
import { newUuid } from "@/features/time-tracking/_common/trackerCommands.ts";
import { Archive, ArchiveRestore, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * Drawer for editing one activity definition's metadata. Mirrors the
 * TaskEditorSheet's "save per change, share one correlationId per open"
 * pattern. Highlights the special `jump_on` kind because that one drives
 * the teammate-avatar quick-row in the TrackerBar.
 */
export interface ActivityEditorSheetProps extends WithFrontServices {
  activity: Activity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityEditorSheet(props: ActivityEditorSheetProps) {
  const { activity } = props;
  const [correlationId, setCorrelationId] = useState(() => newUuid());
  useEffect(() => {
    if (props.open) setCorrelationId(newUuid());
  }, [props.open, activity.id]);

  const submit = async (payload: ProjectEventPayload, successMsg: string) => {
    const envelope = buildProjectEnvelope({
      projectId: activity.projectId,
      correlationId,
      aggregateKind: "activity",
      aggregateId: activity.id,
      expectedAggregateVersion: activity.version,
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
      <SheetContent side="right" className="w-[28rem] sm:max-w-none">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {activity.name}
            {activity.isArchived && (
              <Badge tone="secondary" variant="warning" size="sm">
                archived
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            v{activity.version} · last updated{" "}
            {activity.updatedAt.toLocaleString()}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-5 overflow-y-auto pr-1">
          <RenameSection activity={activity} onSubmit={submit} />
          <DescriptionSection activity={activity} onSubmit={submit} />
          <KindsSection activity={activity} onSubmit={submit} />
        </div>

        <SheetFooter className="mt-4 flex-row justify-end gap-2">
          <ArchiveButton activity={activity} onSubmit={submit} />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type Submit = (
  payload: ProjectEventPayload,
  successMsg: string,
) => Promise<boolean>;

function RenameSection({
  activity,
  onSubmit,
}: {
  activity: Activity;
  onSubmit: Submit;
}) {
  const [name, setName] = useState(activity.name);
  useEffect(() => setName(activity.name), [activity.name]);
  const dirty = name.trim() !== activity.name;
  return (
    <section className="flex flex-col gap-1.5">
      <Label htmlFor="activity-name">Name</Label>
      <div className="flex items-center gap-2">
        <Input
          id="activity-name"
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
              buildActivityRenamedPayload(activity.id, name.trim()),
              "Activity renamed",
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
  activity,
  onSubmit,
}: {
  activity: Activity;
  onSubmit: Submit;
}) {
  const [desc, setDesc] = useState(activity.description ?? "");
  useEffect(
    () => setDesc(activity.description ?? ""),
    [activity.description],
  );
  const trimmed = desc.trim();
  const next = trimmed.length === 0 ? null : trimmed;
  const dirty = next !== (activity.description ?? null);
  return (
    <section className="flex flex-col gap-1.5">
      <Label htmlFor="activity-description">Description</Label>
      <Textarea
        id="activity-description"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        rows={3}
        maxLength={2000}
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          disabled={!dirty}
          onClick={() =>
            onSubmit(
              buildActivityDescriptionChangedPayload(activity.id, next),
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

function KindsSection({
  activity,
  onSubmit,
}: {
  activity: Activity;
  onSubmit: Submit;
}) {
  const [kinds, setKinds] = useState<string[]>(activity.kinds);
  const [customKind, setCustomKind] = useState("");
  useEffect(() => setKinds(activity.kinds), [activity.kinds]);

  const dirty = useMemo(() => {
    const a = [...kinds].sort().join("|");
    const b = [...activity.kinds].sort().join("|");
    return a !== b;
  }, [kinds, activity.kinds]);

  const toggle = (kind: string) => {
    setKinds((prev) =>
      prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind],
    );
  };

  const addCustom = () => {
    const k = customKind.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_]*$/.test(k)) return;
    if (kinds.includes(k)) return;
    setKinds((prev) => [...prev, k]);
    setCustomKind("");
  };

  return (
    <section className="flex flex-col gap-2">
      <Label>Kinds</Label>
      <p className="text-xs text-muted-foreground">
        Picking <code>jump_on</code> makes this activity available in the
        teammate-avatar quick-row in the TrackerBar.
      </p>
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
      {kinds.filter((k) => !KNOWN_ACTIVITY_KINDS.includes(k as never)).length >
        0 && (
        <div className="flex flex-wrap gap-1">
          {kinds
            .filter((k) => !KNOWN_ACTIVITY_KINDS.includes(k as never))
            .map((k) => (
              <Badge
                key={k}
                tone="secondary"
                variant="neutral"
                className="gap-1 pr-1"
              >
                <span className="font-mono">{k}</span>
                <button
                  type="button"
                  aria-label={`Remove kind ${k}`}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
                  onClick={() => toggle(k)}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={customKind}
          onChange={(e) => setCustomKind(e.target.value)}
          placeholder="custom kind (slug)"
          className="font-mono text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 px-2"
          onClick={addCustom}
          disabled={!/^[a-z0-9][a-z0-9_]*$/.test(customKind.trim().toLowerCase())}
        >
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          disabled={!dirty}
          onClick={() =>
            onSubmit(
              buildActivityKindsChangedPayload(activity.id, kinds),
              "Kinds saved",
            )
          }
        >
          Save kinds
        </Button>
      </div>
    </section>
  );
}

function ArchiveButton({
  activity,
  onSubmit,
}: {
  activity: Activity;
  onSubmit: Submit;
}) {
  if (activity.isArchived) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          onSubmit(
            buildActivityUnarchivedPayload(activity.id),
            "Unarchived",
          )
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
      onClick={() =>
        onSubmit(buildActivityArchivedPayload(activity.id), "Archived")
      }
      className="gap-1.5"
    >
      <Archive className="size-3.5" />
      Archive
    </Button>
  );
}
