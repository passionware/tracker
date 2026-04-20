import type { Activity } from "@/api/activity/activity.api.ts";
import type { Project } from "@/api/project/project.api.ts";
import { projectQueryUtils } from "@/api/project/project.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { ActivityCreateDialog } from "@/features/time-tracking/activity-manager/ActivityCreateDialog.tsx";
import { ActivityEditorSheet } from "@/features/time-tracking/activity-manager/ActivityEditorSheet.tsx";
import { cn } from "@/lib/utils.ts";
import type { ClientSpec, WorkspaceSpec } from "@/routing/routingUtils.ts";
import { rd } from "@passionware/monads";
import { useMemo, useState } from "react";

/**
 * Activity definitions are project-scoped (a "Code review" on Project A is a
 * different aggregate than on Project B), so the page funnels through a
 * project picker first. Once a project is chosen we render the activity
 * list and surface create / edit affordances backed by the project event
 * stream.
 */
export function TimeTrackingActivitiesPage(
  props: WithFrontServices & {
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  const [projectId, setProjectId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const activities = props.services.activityService.useActivities(
    useMemo(
      () => ({
        projectId: projectId ?? -1, // safe sentinel: -1 won't match anything
        includeArchived: true,
        limit: 200,
      }),
      [projectId],
    ),
  );

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
        <BreadcrumbPage>Activities</BreadcrumbPage>,
      ]}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm font-medium">
            Project activities
          </CardTitle>
          <div className="flex items-center gap-2">
            {rd
              .journey(projects)
              .wait(<Skeleton className="h-9 w-56" />)
              .catch(renderError)
              .map((list) => (
                <ProjectPicker
                  projects={list}
                  value={projectId}
                  onChange={setProjectId}
                />
              ))}
            {projectId !== null && (
              <ActivityCreateDialog
                services={props.services}
                projectId={projectId}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {projectId === null ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Pick a project to see its activity definitions.
            </div>
          ) : (
            rd
              .journey(activities)
              .wait(
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>,
              )
              .catch(renderError)
              .map((list) => (
                <ActivityList list={list} onEdit={setEditingId} />
              ))
          )}
        </CardContent>
      </Card>

      {(() => {
        const editing =
          editingId === null
            ? null
            : (rd
                .tryGet(activities)
                ?.find((a) => a.id === editingId) ?? null);
        if (editing === null) return null;
        return (
          <ActivityEditorSheet
            services={props.services}
            activity={editing}
            open
            onOpenChange={(o) => {
              if (!o) setEditingId(null);
            }}
          />
        );
      })()}
    </CommonPageContainer>
  );
}

function ProjectPicker(props: {
  projects: Project[];
  value: number | null;
  onChange: (next: number) => void;
}) {
  if (props.projects.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        No projects in scope.
      </span>
    );
  }
  return (
    <Select
      value={props.value?.toString() ?? ""}
      onValueChange={(v) => props.onChange(Number(v))}
    >
      <SelectTrigger className="h-9 w-56 text-sm">
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

function ActivityList(props: {
  list: Activity[];
  onEdit: (activityId: string) => void;
}) {
  if (props.list.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No activities defined yet. Click <strong>New activity</strong> to add
        one.
      </div>
    );
  }
  // Show non-archived first; archived sink to the bottom for housekeeping.
  const sorted = [...props.list].sort((a, b) => {
    if (a.isArchived !== b.isArchived) return a.isArchived ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
  return (
    <ul className="flex flex-col divide-y divide-border">
      {sorted.map((a) => (
        <li
          key={a.id}
          className={cn(
            "flex cursor-pointer items-center justify-between gap-3 py-2 hover:bg-accent/30",
            a.isArchived && "opacity-60",
          )}
          onClick={() => props.onEdit(a.id)}
        >
          <div className="flex flex-col">
            <span className="text-sm font-medium">{a.name}</span>
            {a.description ? (
              <span className="text-xs text-muted-foreground line-clamp-1 max-w-[28rem]">
                {a.description}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {a.kinds.map((k) => (
              <Badge
                key={k}
                tone="secondary"
                variant={k === "jump_on" ? "info" : "neutral"}
                size="sm"
              >
                <span className="font-mono">{k}</span>
              </Badge>
            ))}
            {a.isArchived && (
              <Badge tone="secondary" variant="warning" size="sm">
                archived
              </Badge>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
