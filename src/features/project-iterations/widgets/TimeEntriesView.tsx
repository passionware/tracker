import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { timeEntryColumns } from "@/features/_common/columns/timeEntry.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { rd } from "@passionware/monads";

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

  // Create a simple query object for the ListView
  const query = {
    sort: [],
  } as any;

  // Convert time entries to RemoteData format
  const timeEntriesData = rd.of(report.data.timeEntries);

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
            <ListView
              data={timeEntriesData}
              query={query}
              onQueryChange={() => {}}
              columns={[
                timeEntryColumns.id,
                timeEntryColumns.task(report.data),
                timeEntryColumns.activity(report.data),
                timeEntryColumns.role(report.data),
                timeEntryColumns.startTime(props.services),
                timeEntryColumns.endTime(props.services),
                timeEntryColumns.duration,
                timeEntryColumns.note,
              ]}
            />
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
