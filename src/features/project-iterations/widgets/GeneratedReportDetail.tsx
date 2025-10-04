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
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { renderError } from "@/features/_common/renderError.tsx";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { maybe, rd } from "@passionware/monads";
import { Calendar, Database, FileText } from "lucide-react";
import { GeneratedReportTabs } from "./GeneratedReportHeader";

export function GeneratedReportDetail(
  props: WithFrontServices & {
    projectIterationId: ProjectIteration["id"];
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
    projectId: number;
    reportId: GeneratedReportSource["id"];
  },
) {
  const generatedReport =
    props.services.generatedReportSourceService.useGeneratedReportSource(
      maybe.of(props.reportId),
    );

  const iteration =
    props.services.projectIterationService.useProjectIterationDetail(
      props.projectIterationId,
    );

  return (
    <div className="space-y-6">
      <GeneratedReportTabs {...props} />
      {/* Report Details */}
      {rd
        .journey(generatedReport)
        .wait(
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>,
        )
        .catch(renderError)
        .map((report) => (
          <div className="space-y-6">
            {/* Basic Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                  <CardDescription>
                    Report metadata and creation details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Report ID</span>
                    <Badge variant="secondary">{report.id}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Created At</span>
                    <span className="text-sm text-slate-600">
                      {props.services.formatService.temporal.single.compactWithTime(
                        report.createdAt,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">
                      Project Iteration
                    </span>
                    <span className="text-sm text-slate-600">
                      {props.projectIterationId}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Data Statistics
                  </CardTitle>
                  <CardDescription>Summary of imported data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Time Entries</span>
                    <Badge variant="secondary">
                      {report.data.timeEntries.length}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Task Types</span>
                    <Badge variant="secondary">
                      {Object.keys(report.data.definitions.taskTypes).length}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Activity Types</span>
                    <Badge variant="secondary">
                      {
                        Object.keys(report.data.definitions.activityTypes)
                          .length
                      }
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Role Types</span>
                    <Badge variant="secondary">
                      {Object.keys(report.data.definitions.roleTypes).length}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Time Range */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Time Range
                  </CardTitle>
                  <CardDescription>
                    Period covered by this report
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {rd.tryMap(iteration, (iter) => (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Start Date</span>
                        <span className="text-sm text-slate-600">
                          {props.services.formatService.temporal.single.compact(
                            iter.periodStart,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">End Date</span>
                        <span className="text-sm text-slate-600">
                          {props.services.formatService.temporal.single.compact(
                            iter.periodEnd,
                          )}
                        </span>
                      </div>
                    </>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Types Grid - 3 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Task Types */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>Task Types</CardTitle>
                  <CardDescription>
                    Available task types in this report
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                  <div className="space-y-3">
                    {Object.entries(report.data.definitions.taskTypes).map(
                      ([key, taskType]) => (
                        <div key={key} className="p-3 border rounded-lg">
                          <h4 className="font-medium">{taskType.name}</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            {taskType.description}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Activity Types */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>Activity Types</CardTitle>
                  <CardDescription>
                    Available activity types in this report
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                  <div className="space-y-3">
                    {Object.entries(report.data.definitions.activityTypes).map(
                      ([key, activityType]) => (
                        <div key={key} className="p-3 border rounded-lg">
                          <h4 className="font-medium">{activityType.name}</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            {activityType.description}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Role Types */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>Role Types</CardTitle>
                  <CardDescription>
                    Available role types with their rates
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                  <div className="space-y-3">
                    {Object.entries(report.data.definitions.roleTypes).map(
                      ([key, roleType]) => (
                        <div key={key} className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">{roleType.name}</h4>
                          <p className="text-sm text-slate-600 mb-3">
                            {roleType.description}
                          </p>
                          <div className="space-y-2">
                            {roleType.rates.map((rate, index) => (
                              <div
                                key={index}
                                className="flex justify-between items-center text-sm"
                              >
                                <span>
                                  {rate.activityType} - {rate.taskType}
                                </span>
                                <Badge variant="secondary">
                                  {rate.rate} {rate.currency}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ))}
    </div>
  );
}
