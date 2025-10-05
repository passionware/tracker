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
import { AdvancedTimelineVisualization } from "@/features/_common/AdvancedTimelineVisualization.tsx";
import { timeEntryColumns } from "@/features/_common/columns/timeEntry.tsx";
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget.tsx";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView";
import { ListView } from "@/features/_common/ListView.tsx";
import { TimelineVisualization } from "@/features/_common/TimeLineVisualization.tsx";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { maybe, rd } from "@passionware/monads";

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

  // Use the view service to get processed data
  const basicInfo =
    props.services.generatedReportViewService.getBasicInformationView(report);
  const rolesSummary =
    props.services.generatedReportViewService.getRolesSummaryView(report);
  const contractorsSummary =
    props.services.generatedReportViewService.getContractorsSummaryView(report);

  // Create a simple query object for the ListView
  const query = {
    sort: [],
  } as any;

  // Convert time entries to RemoteData format
  const timeEntriesData = rd.of(report.data.timeEntries);

  return (
    <div className="space-y-6">
      {/* Timeline Visualizations */}
      <AdvancedTimelineVisualization
        report={report}
        services={props.services}
      />

      <TimelineVisualization report={report} services={props.services} />

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
                timeEntryColumns.contractor(props.services),
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {basicInfo.statistics.timeEntriesCount}
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
              {basicInfo.statistics.taskTypesCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {basicInfo.statistics.totalCostBudget.length === 0 ? (
                "No rates"
              ) : basicInfo.statistics.totalCostBudget.length === 1 ? (
                props.services.formatService.financial.currency(
                  basicInfo.statistics.totalCostBudget[0],
                )
              ) : (
                <CurrencyValueWidget
                  values={basicInfo.statistics.totalCostBudget}
                  services={props.services}
                  exchangeService={props.services.exchangeService}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Breakdown by Role */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Budget by Role</CardTitle>
            <CardDescription>Cost breakdown by role type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rolesSummary.roles
                .filter((role) => role.entriesCount > 0)
                .map((role) => (
                  <Card
                    key={role.roleId}
                    className="border-l-4 border-l-blue-500"
                  >
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">{role.name}</h4>
                        <div className="text-xs text-slate-600">
                          {role.entriesCount} entries •{" "}
                          {role.totalHours.toFixed(1)}h
                        </div>
                        <div className="text-sm font-semibold">
                          {role.costBudget.length === 0 ? (
                            "No rates"
                          ) : role.costBudget.length === 1 ? (
                            props.services.formatService.financial.currency(
                              role.costBudget[0],
                            )
                          ) : (
                            <CurrencyValueWidget
                              values={role.costBudget}
                              services={props.services}
                              exchangeService={props.services.exchangeService}
                            />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Breakdown by Contractor */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Budget by Contractor</CardTitle>
            <CardDescription>Cost breakdown by contractor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contractorsSummary.contractors.map((contractor) => (
                <Card
                  key={contractor.contractorId}
                  className="border-l-4 border-l-green-500"
                >
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <ContractorWidget
                        contractorId={maybe.of(contractor.contractorId)}
                        services={props.services}
                        layout="full"
                        size="sm"
                      />
                      <div className="text-xs text-slate-600">
                        {contractor.entriesCount} entries •{" "}
                        {contractor.totalHours.toFixed(1)}h
                      </div>
                      <div className="text-sm font-semibold">
                        {contractor.costBudget.length === 0 ? (
                          "No rates"
                        ) : contractor.costBudget.length === 1 ? (
                          props.services.formatService.financial.currency(
                            contractor.costBudget[0],
                          )
                        ) : (
                          <CurrencyValueWidget
                            values={contractor.costBudget}
                            services={props.services}
                            exchangeService={props.services.exchangeService}
                          />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
