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
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget.tsx";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView";
import { renderError } from "@/features/_common/renderError.tsx";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { maybe, rd, RemoteData } from "@passionware/monads";
import { Calendar, Database, FileText } from "lucide-react";
import { Route, Routes } from "react-router-dom";
import { GeneratedReportTabs } from "./GeneratedReportHeader";
import { TimeEntriesView } from "./TimeEntriesView";

function BasicInformationView(
  props: WithFrontServices & {
    report: GeneratedReportSource;
    iteration: RemoteData<ProjectIteration>;
    projectIterationId: ProjectIteration["id"];
  },
) {
  const basicInfo =
    props.services.generatedReportViewService.getBasicInformationView(
      props.report,
    );

  return (
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
              <Badge variant="secondary">{basicInfo.reportId}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Created At</span>
              <span className="text-sm text-slate-600">
                {props.services.formatService.temporal.single.compactWithTime(
                  basicInfo.createdAt,
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Project Iteration</span>
              <span className="text-sm text-slate-600">
                {basicInfo.projectIterationId}
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
                {basicInfo.statistics.timeEntriesCount}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Task Types</span>
              <Badge variant="secondary">
                {basicInfo.statistics.taskTypesCount}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Activity Types</span>
              <Badge variant="secondary">
                {basicInfo.statistics.activityTypesCount}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Role Types</span>
              <Badge variant="secondary">
                {basicInfo.statistics.roleTypesCount}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Total Budget</span>
              <Badge variant="primary">
                <CurrencyValueWidget
                  values={basicInfo.statistics.totalBudget}
                  services={props.services}
                  exchangeService={props.services.exchangeService}
                  className="text-inherit"
                />
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
            <CardDescription>Period covered by this report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {rd.tryMap(props.iteration, (iter: ProjectIteration) => (
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

      {/* Budget Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget by Role */}
        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
            <CardDescription>
              Roles are independent of contractors. Contractors may have
              multiple roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(() => {
                const rolesSummary =
                  props.services.generatedReportViewService.getRolesSummaryView(
                    props.report,
                  );
                return rolesSummary.roles.map((role) => {
                  if (role.entriesCount === 0) return null;

                  return (
                    <div key={role.roleId} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{role.name}</h4>
                        <div className="text-right text-sm">
                          <div className="font-semibold">
                            {role.budget.length === 0 ? (
                              "No rates"
                            ) : (
                              <CurrencyValueWidget
                                values={role.budget}
                                services={props.services}
                                exchangeService={props.services.exchangeService}
                              />
                            )}
                          </div>
                          <div className="text-slate-600">
                            {role.entriesCount} entries •{" "}
                            {role.totalHours.toFixed(1)}h
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {role.rates.map((rate, index) => (
                          <div
                            key={index}
                            className="flex justify-between text-xs text-slate-600"
                          >
                            <span>
                              {rate.activityType} - {rate.taskType}
                            </span>
                            <span>
                              {props.services.formatService.financial.amount(
                                rate.rate,
                                rate.currency,
                              )}
                              /h
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Budget by Contractor */}
        <Card>
          <CardHeader>
            <CardTitle>Contractors</CardTitle>
            <CardDescription>Cost breakdown by contractor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(() => {
                const contractorsSummary =
                  props.services.generatedReportViewService.getContractorsSummaryView(
                    props.report,
                  );
                return contractorsSummary.contractors.map((contractor) => (
                  <div
                    key={contractor.contractorId}
                    className="p-3 border rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <ContractorWidget
                          contractorId={maybe.of(contractor.contractorId)}
                          services={props.services}
                          layout="full"
                          size="sm"
                        />
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-semibold">
                          {contractor.budget.length === 0 ? (
                            "No rates"
                          ) : (
                            <CurrencyValueWidget
                              values={contractor.budget}
                              services={props.services}
                              exchangeService={props.services.exchangeService}
                            />
                          )}
                        </div>
                        <div className="text-slate-600">
                          {contractor.entriesCount} entries •{" "}
                          {contractor.totalHours.toFixed(1)}h
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {contractor.budget.map((currencyValue, index) => (
                        <div
                          key={index}
                          className="flex justify-between text-xs text-slate-600"
                        >
                          <span>{currencyValue.currency}</span>
                          <span>
                            {props.services.formatService.financial.amount(
                              currencyValue.amount,
                              currencyValue.currency,
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Types Grid - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              {(() => {
                const taskTypesSummary =
                  props.services.generatedReportViewService.getTaskTypesSummaryView(
                    props.report,
                  );
                return taskTypesSummary.taskTypes.map((taskType) => {
                  if (taskType.entriesCount === 0) return null;

                  return (
                    <div
                      key={taskType.taskId}
                      className="p-3 border rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{taskType.name}</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            {taskType.description}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-semibold">
                            {taskType.budget.length === 0 ? (
                              "No rates"
                            ) : (
                              <CurrencyValueWidget
                                values={taskType.budget}
                                services={props.services}
                                exchangeService={props.services.exchangeService}
                              />
                            )}
                          </div>
                          <div className="text-slate-600">
                            {taskType.entriesCount} entries •{" "}
                            {taskType.totalHours.toFixed(1)}h
                          </div>
                        </div>
                      </div>
                      {taskType.budget.length > 1 && (
                        <div className="space-y-1 mt-2 pt-2 border-t border-slate-200">
                          {taskType.budget.map((currencyValue, index) => (
                            <div
                              key={index}
                              className="flex justify-between text-xs text-slate-600"
                            >
                              <span>{currencyValue.currency}</span>
                              <span>
                                {props.services.formatService.financial.amount(
                                  currencyValue.amount,
                                  currencyValue.currency,
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
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
              {(() => {
                const activityTypesSummary =
                  props.services.generatedReportViewService.getActivityTypesSummaryView(
                    props.report,
                  );
                return activityTypesSummary.activityTypes.map(
                  (activityType) => {
                    if (activityType.entriesCount === 0) return null;

                    return (
                      <div
                        key={activityType.activityId}
                        className="p-3 border rounded-lg"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">{activityType.name}</h4>
                            <p className="text-sm text-slate-600 mt-1">
                              {activityType.description}
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <div className="font-semibold">
                              {activityType.budget.length === 0 ? (
                                "No rates"
                              ) : (
                                <CurrencyValueWidget
                                  values={activityType.budget}
                                  services={props.services}
                                  exchangeService={
                                    props.services.exchangeService
                                  }
                                />
                              )}
                            </div>
                            <div className="text-slate-600">
                              {activityType.entriesCount} entries •{" "}
                              {activityType.totalHours.toFixed(1)}h
                            </div>
                          </div>
                        </div>
                        {activityType.budget.length > 1 && (
                          <div className="space-y-1 mt-2 pt-2 border-t border-slate-200">
                            {activityType.budget.map((currencyValue, index) => (
                              <div
                                key={index}
                                className="flex justify-between text-xs text-slate-600"
                              >
                                <span>{currencyValue.currency}</span>
                                <span>
                                  {props.services.formatService.financial.amount(
                                    currencyValue.amount,
                                    currencyValue.currency,
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  },
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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
          <Routes>
            <Route
              path=""
              element={
                <BasicInformationView
                  report={report}
                  iteration={iteration}
                  {...props}
                />
              }
            />
            <Route
              path="basic"
              element={
                <BasicInformationView
                  report={report}
                  iteration={iteration}
                  {...props}
                />
              }
            />
            <Route
              path="time-entries"
              element={<TimeEntriesView report={report} {...props} />}
            />
          </Routes>
        ))}
    </div>
  );
}
