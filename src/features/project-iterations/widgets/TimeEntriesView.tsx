import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";

export function TimeEntriesView(
  props: WithFrontServices & {
    report: GeneratedReportSource;
    projectIterationId: ProjectIteration["id"];
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
    projectId: number;
    reportId: GeneratedReportSource["id"];
  },
) {
  const { report } = props;

  // Helper function to get task type name
  const getTaskTypeName = (taskId: string) => {
    const taskType = report.data.definitions.taskTypes[taskId];
    return taskType?.name || taskId;
  };

  // Helper function to get activity type name
  const getActivityTypeName = (activityId: string) => {
    const activityType = report.data.definitions.activityTypes[activityId];
    return activityType?.name || activityId;
  };

  // Helper function to get role type name
  const getRoleTypeName = (roleId: string) => {
    const roleType = report.data.definitions.roleTypes[roleId];
    return roleType?.name || roleId;
  };

  // Helper function to calculate duration
  const calculateDuration = (startAt: Date, endAt: Date) => {
    const diffMs = endAt.getTime() - startAt.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return `${diffHours.toFixed(1)}h`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Time Entries</CardTitle>
          <CardDescription>
            Detailed breakdown of all time entries in this report
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report.data.timeEntries.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No time entries found in this report.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.data.timeEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-xs">
                        {entry.id}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getTaskTypeName(entry.taskId)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="accent1">
                          {getActivityTypeName(entry.activityId)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="primary">
                          {getRoleTypeName(entry.roleId)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {props.services.formatService.temporal.single.compactWithTime(
                          entry.startAt,
                        )}
                      </TableCell>
                      <TableCell>
                        {props.services.formatService.temporal.single.compactWithTime(
                          entry.endAt,
                        )}
                      </TableCell>
                      <TableCell className="font-mono">
                        {calculateDuration(entry.startAt, entry.endAt)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {entry.note || (
                          <span className="text-slate-400 italic">No note</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report.data.timeEntries.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report.data.timeEntries
                .reduce((total, entry) => {
                  const diffMs =
                    entry.endAt.getTime() - entry.startAt.getTime();
                  const diffHours = diffMs / (1000 * 60 * 60);
                  return total + diffHours;
                }, 0)
                .toFixed(1)}
              h
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unique Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(report.data.timeEntries.map((e) => e.taskId)).size}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
