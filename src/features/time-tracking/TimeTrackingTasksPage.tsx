import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { formatElapsedSeconds } from "@/features/time-tracking/_common/useElapsedSeconds.ts";
import { cn } from "@/lib/utils.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import type { ClientSpec, WorkspaceSpec } from "@/routing/routingUtils.ts";
import type { Project } from "@/api/project/project.api.ts";
import { projectQueryUtils } from "@/api/project/project.api.ts";
import type {
  TaskActuals,
  TaskDefinition,
  TaskDefinitionQuery,
} from "@/api/task-definition/task-definition.api.ts";
import { AssigneeChips } from "@/features/time-tracking/_common/AssigneeChips.tsx";
import { TaskBurndownSparkline } from "@/features/time-tracking/_common/TaskBurndownSparkline.tsx";
import { TaskCreateDialog } from "@/features/time-tracking/task-manager/TaskCreateDialog.tsx";
import { TaskEditorSheet } from "@/features/time-tracking/task-manager/TaskEditorSheet.tsx";
import type { TaskBurndownPoint } from "@/services/io/TaskDefinitionService/TaskDefinitionService.ts";
import { rd } from "@passionware/monads";
import {
  CheckCircle2,
  ExternalLink as ExternalLinkIcon,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";

/**
 * Tasks overview — read-only first pass.
 *
 * Lists `task_current` rows scoped to the active workspace + client (when
 * specified), with totals from `task_actuals` so engineers can see
 * "% over estimate" at a glance. Inline editing of estimate, external
 * links, assignments etc. is tracked by the dedicated TaskManager todo.
 *
 * Filters today: search by name + the implicit workspace/client breadcrumb.
 * The page already pulls from the projection, so as soon as the worker
 * starts emitting events (and the projection writes them) this populates.
 */
export function TimeTrackingTasksPage(
  props: WithFrontServices & {
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  const [search, setSearch] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const projectsQuery = useMemo(
    () =>
      projectQueryUtils.ensureDefault(projectQueryUtils.ofDefault(), {
        workspaceId: props.workspaceId,
        clientId: props.clientId,
      }),
    [props.workspaceId, props.clientId],
  );
  const projects = props.services.projectService.useProjects(projectsQuery);

  const taskQuery = useMemo<TaskDefinitionQuery>(
    () => ({
      clientId: idSpecUtils.mapSpecificOrElse(
        props.clientId,
        (id) => id as number,
        undefined,
      ),
      includeArchived: false,
      includeCompleted: showCompleted,
      limit: 500,
    }),
    [props.clientId, showCompleted],
  );
  const tasks = props.services.taskDefinitionService.useTasks(taskQuery);

  const taskIds = useMemo(
    () => rd.tryGet(tasks)?.map((t) => t.id) ?? [],
    [tasks],
  );
  const actuals =
    props.services.taskDefinitionService.useTaskActualsForTasks(taskIds);
  const burndown =
    props.services.taskDefinitionService.useTaskBurndownSeries(taskIds, 14);
  const auth = props.services.authService.useAuth();
  const currentUserId = rd.tryGet(auth)?.id ?? null;

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
        <BreadcrumbPage>Tasks</BreadcrumbPage>,
      ]}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm font-medium">Project tasks</CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Switch
                id="show-completed"
                checked={showCompleted}
                onCheckedChange={setShowCompleted}
              />
              <Label htmlFor="show-completed" className="text-xs">
                Show completed
              </Label>
            </div>
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-2 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks…"
                className="h-9 pl-7 text-sm"
              />
            </div>
            <TaskCreateDialog
              services={props.services}
              workspaceId={props.workspaceId}
              clientId={props.clientId}
            />
          </div>
        </CardHeader>
        <CardContent>
          {rd
            .journey(tasks)
            .wait(
              <div className="flex flex-col gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>,
            )
            .catch(renderError)
            .map((list) => (
              <TasksTable
                tasks={filterTasks(list, search)}
                projects={rd.tryGet(projects) ?? []}
                actuals={rd.tryGet(actuals) ?? new Map()}
                burndown={rd.tryGet(burndown) ?? new Map()}
                currentUserId={currentUserId}
                onEdit={setEditingTaskId}
              />
            ))}
        </CardContent>
      </Card>
      {(() => {
        const editing =
          editingTaskId === null
            ? null
            : (rd.tryGet(tasks)?.find((t) => t.id === editingTaskId) ?? null);
        if (editing === null) return null;
        return (
          <TaskEditorSheet
            services={props.services}
            task={editing}
            open
            onOpenChange={(o) => {
              if (!o) setEditingTaskId(null);
            }}
          />
        );
      })()}
    </CommonPageContainer>
  );
}

function filterTasks(
  list: TaskDefinition[],
  search: string,
): TaskDefinition[] {
  const needle = search.trim().toLowerCase();
  if (needle === "") return list;
  return list.filter(
    (t) =>
      t.name.toLowerCase().includes(needle) ||
      (t.description ?? "").toLowerCase().includes(needle),
  );
}

function TasksTable(props: {
  tasks: TaskDefinition[];
  projects: Project[];
  actuals: Map<string, TaskActuals>;
  burndown: Map<string, TaskBurndownPoint[]>;
  currentUserId: string | null;
  onEdit: (taskId: string) => void;
}) {
  const projectMap = useMemo(
    () => new Map(props.projects.map((p) => [p.id, p])),
    [props.projects],
  );
  if (props.tasks.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No tasks match. Tasks appear here once the project event stream
        starts emitting `TaskCreated` events.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Task</th>
            <th className="py-2 pr-4 font-medium">Project</th>
            <th className="py-2 pr-4 font-medium">Assignees</th>
            <th className="py-2 pr-4 font-medium">Estimate</th>
            <th className="py-2 pr-4 font-medium">Actual</th>
            <th className="py-2 pr-4 font-medium">Δ</th>
            <th className="py-2 pr-4 font-medium">14d trend</th>
            <th className="py-2 pr-4 font-medium">Links</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {props.tasks.map((task) => {
            const actuals = props.actuals.get(task.id) ?? null;
            const project = projectMap.get(task.projectId) ?? null;
            const series = props.burndown.get(task.id) ?? [];
            return (
              <TaskRow
                key={task.id}
                task={task}
                project={project}
                actuals={actuals}
                series={series}
                currentUserId={props.currentUserId}
                onEdit={props.onEdit}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TaskRow(props: {
  task: TaskDefinition;
  project: Project | null;
  actuals: TaskActuals | null;
  series: TaskBurndownPoint[];
  currentUserId: string | null;
  onEdit: (taskId: string) => void;
}) {
  const { task, actuals } = props;
  const completed = task.completedAt !== null;
  const totalSeconds = actuals?.totalSeconds ?? 0;
  const estimateSeconds = estimateInSeconds(task);
  const overage =
    estimateSeconds !== null && estimateSeconds > 0
      ? totalSeconds / estimateSeconds
      : null;

  return (
    <tr
      className={cn(
        "cursor-pointer hover:bg-accent/30",
        completed && "opacity-60",
      )}
      onClick={() => props.onEdit(task.id)}
    >
      <td className="py-2 pr-4 align-top">
        <div className="flex items-center gap-2">
          {completed ? (
            <CheckCircle2 className="size-4 text-emerald-600" />
          ) : null}
          <span className="font-medium">{task.name}</span>
        </div>
        {task.description ? (
          <div className="text-xs text-muted-foreground line-clamp-1 max-w-[28rem]">
            {task.description}
          </div>
        ) : null}
      </td>
      <td className="py-2 pr-4 align-top text-xs text-muted-foreground">
        {props.project?.name ?? `Project ${task.projectId}`}
      </td>
      <td className="py-2 pr-4 align-top">
        <AssigneeChips
          assignees={task.assignees}
          currentUserId={props.currentUserId}
          size="xs"
          maxVisible={3}
        />
      </td>
      <td className="py-2 pr-4 align-top text-xs tabular-nums">
        {task.estimateQuantity !== null
          ? `${task.estimateQuantity} ${task.estimateUnit ?? ""}`
          : "—"}
      </td>
      <td className="py-2 pr-4 align-top text-xs tabular-nums">
        {actuals === null ? "—" : formatElapsedSeconds(totalSeconds)}
      </td>
      <td className="py-2 pr-4 align-top text-xs tabular-nums">
        {overage === null ? (
          "—"
        ) : (
          <span
            className={cn(
              overage > 1.1
                ? "text-red-600"
                : overage > 0.85
                  ? "text-amber-600"
                  : "text-emerald-700",
            )}
          >
            {Math.round(overage * 100)}%
          </span>
        )}
      </td>
      <td className="py-2 pr-4 align-top">
        <TaskBurndownSparkline
          points={props.series}
          estimateSeconds={estimateSeconds}
        />
      </td>
      <td className="py-2 pr-4 align-top">
        <div className="flex flex-wrap gap-1">
          {task.externalLinks.map((link, idx) => (
            <a
              key={`${link.url}-${idx}`}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              title={link.url}
            >
              <ExternalLinkIcon className="size-3" />
              {link.provider}
            </a>
          ))}
        </div>
      </td>
    </tr>
  );
}

function estimateInSeconds(task: TaskDefinition): number | null {
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
