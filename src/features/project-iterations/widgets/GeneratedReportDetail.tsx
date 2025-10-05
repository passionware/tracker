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

// Helper function to calculate approximate total in EUR when multiple currencies exist
function calculateApproximateTotal(
  budgetByCurrency: Record<string, number>,
): number | null {
  const currencies = Object.keys(budgetByCurrency);
  if (currencies.length <= 1) return null;

  // For now, return null to avoid complex async logic
  // In a real implementation, we'd need to use useExchangeRates hook
  // which requires React component context
  return null;
}

function BasicInformationView(
  props: WithFrontServices & {
    report: GeneratedReportSource;
    iteration: RemoteData<ProjectIteration>;
    projectIterationId: ProjectIteration["id"];
  },
) {
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
              <Badge variant="secondary">{props.report.id}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Created At</span>
              <span className="text-sm text-slate-600">
                {props.services.formatService.temporal.single.compactWithTime(
                  props.report.createdAt,
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Project Iteration</span>
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
                {props.report.data.timeEntries.length}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Task Types</span>
              <Badge variant="secondary">
                {Object.keys(props.report.data.definitions.taskTypes).length}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Activity Types</span>
              <Badge variant="secondary">
                {
                  Object.keys(props.report.data.definitions.activityTypes)
                    .length
                }
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Role Types</span>
              <Badge variant="secondary">
                {Object.keys(props.report.data.definitions.roleTypes).length}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Total Budget</span>
              <Badge variant="primary">
                {(() => {
                  // Calculate total budget based on role rates and time entries
                  const budgetByCurrency = props.report.data.timeEntries.reduce(
                    (acc, entry) => {
                      const roleType =
                        props.report.data.definitions.roleTypes[entry.roleId];
                      if (!roleType || roleType.rates.length === 0) return acc;

                      const matchingRate =
                        roleType.rates.find(
                          (rate) =>
                            rate.activityType === entry.activityId &&
                            rate.taskType === entry.taskId,
                        ) || roleType.rates[0];

                      const hours =
                        (entry.endAt.getTime() - entry.startAt.getTime()) /
                        (1000 * 60 * 60);
                      const cost = hours * matchingRate.rate;
                      const currency = matchingRate.currency;

                      if (!acc[currency]) acc[currency] = 0;
                      acc[currency] += cost;
                      return acc;
                    },
                    {} as Record<string, number>,
                  );

                  const currencies = Object.keys(budgetByCurrency);
                  if (currencies.length === 0) return "No rates";
                  if (currencies.length === 1) {
                    const currency = currencies[0];
                    return props.services.formatService.financial.amount(
                      budgetByCurrency[currency],
                      currency,
                    );
                  }

                  // Multiple currencies - show approximate total in EUR
                  const approximateTotal =
                    calculateApproximateTotal(budgetByCurrency);
                  if (approximateTotal !== null) {
                    return `≈${props.services.formatService.financial.amount(
                      approximateTotal,
                      "EUR",
                    )}`;
                  }

                  return `${currencies.length} currencies`;
                })()}
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
              {Object.entries(props.report.data.definitions.roleTypes).map(
                ([roleId, roleType]) => {
                  const roleEntries = props.report.data.timeEntries.filter(
                    (entry) => entry.roleId === roleId,
                  );
                  if (roleEntries.length === 0) return null;

                  const budgetByCurrency = roleEntries.reduce(
                    (acc, entry) => {
                      const matchingRate =
                        roleType.rates.find(
                          (rate) =>
                            rate.activityType === entry.activityId &&
                            rate.taskType === entry.taskId,
                        ) || roleType.rates[0];

                      const hours =
                        (entry.endAt.getTime() - entry.startAt.getTime()) /
                        (1000 * 60 * 60);
                      const cost = hours * matchingRate.rate;
                      const currency = matchingRate.currency;

                      if (!acc[currency]) acc[currency] = 0;
                      acc[currency] += cost;
                      return acc;
                    },
                    {} as Record<string, number>,
                  );

                  const currencies = Object.keys(budgetByCurrency);
                  const totalHours = roleEntries.reduce((total, entry) => {
                    return (
                      total +
                      (entry.endAt.getTime() - entry.startAt.getTime()) /
                        (1000 * 60 * 60)
                    );
                  }, 0);

                  return (
                    <div key={roleId} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{roleType.name}</h4>
                        <div className="text-right text-sm">
                          <div className="font-semibold">
                            {currencies.length === 0
                              ? "No rates"
                              : currencies.length === 1
                                ? props.services.formatService.financial.amount(
                                    budgetByCurrency[currencies[0]],
                                    currencies[0],
                                  )
                                : `${currencies.length} currencies`}
                          </div>
                          <div className="text-slate-600">
                            {roleEntries.length} entries •{" "}
                            {totalHours.toFixed(1)}h
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {roleType.rates.map((rate, index) => (
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
                },
              )}
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
                // Group entries by contractorId
                const entriesByContractor =
                  props.report.data.timeEntries.reduce(
                    (acc, entry) => {
                      const contractorId = entry.contractorId;
                      if (!acc[contractorId]) acc[contractorId] = [];
                      acc[contractorId].push(entry);
                      return acc;
                    },
                    {} as Record<number, typeof props.report.data.timeEntries>,
                  );

                return Object.entries(entriesByContractor).map(
                  ([contractorId, entries]) => {
                    const budgetByCurrency = entries.reduce(
                      (acc, entry) => {
                        const roleType =
                          props.report.data.definitions.roleTypes[entry.roleId];
                        if (!roleType || roleType.rates.length === 0)
                          return acc;

                        const matchingRate =
                          roleType.rates.find(
                            (rate) =>
                              rate.activityType === entry.activityId &&
                              rate.taskType === entry.taskId,
                          ) || roleType.rates[0];

                        const hours =
                          (entry.endAt.getTime() - entry.startAt.getTime()) /
                          (1000 * 60 * 60);
                        const cost = hours * matchingRate.rate;
                        const currency = matchingRate.currency;

                        if (!acc[currency]) acc[currency] = 0;
                        acc[currency] += cost;
                        return acc;
                      },
                      {} as Record<string, number>,
                    );

                    const currencies = Object.keys(budgetByCurrency);
                    const totalHours = entries.reduce((total, entry) => {
                      return (
                        total +
                        (entry.endAt.getTime() - entry.startAt.getTime()) /
                          (1000 * 60 * 60)
                      );
                    }, 0);

                    return (
                      <div key={contractorId} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <ContractorWidget
                              contractorId={maybe.of(Number(contractorId))}
                              services={props.services}
                              layout="full"
                              size="sm"
                            />
                          </div>
                          <div className="text-right text-sm">
                            <div className="font-semibold">
                              {currencies.length === 0
                                ? "No rates"
                                : currencies.length === 1
                                  ? props.services.formatService.financial.amount(
                                      budgetByCurrency[currencies[0]],
                                      currencies[0],
                                    )
                                  : `${currencies.length} currencies`}
                            </div>
                            <div className="text-slate-600">
                              {entries.length} entries • {totalHours.toFixed(1)}
                              h
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {Object.entries(budgetByCurrency).map(
                            ([currency, amount]) => (
                              <div
                                key={currency}
                                className="flex justify-between text-xs text-slate-600"
                              >
                                <span>{currency}</span>
                                <span>
                                  {props.services.formatService.financial.amount(
                                    amount,
                                    currency,
                                  )}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    );
                  },
                );
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
              {Object.entries(props.report.data.definitions.taskTypes).map(
                ([key, taskType]) => {
                  // Find all time entries for this task type
                  const taskEntries = props.report.data.timeEntries.filter(
                    (entry) => entry.taskId === key,
                  );

                  // Calculate budget for this task type
                  const budgetByCurrency = taskEntries.reduce(
                    (acc, entry) => {
                      const roleType =
                        props.report.data.definitions.roleTypes[entry.roleId];
                      if (!roleType || roleType.rates.length === 0) return acc;

                      const matchingRate =
                        roleType.rates.find(
                          (rate) =>
                            rate.activityType === entry.activityId &&
                            rate.taskType === entry.taskId,
                        ) || roleType.rates[0];

                      const hours =
                        (entry.endAt.getTime() - entry.startAt.getTime()) /
                        (1000 * 60 * 60);
                      const cost = hours * matchingRate.rate;
                      const currency = matchingRate.currency;

                      if (!acc[currency]) acc[currency] = 0;
                      acc[currency] += cost;
                      return acc;
                    },
                    {} as Record<string, number>,
                  );

                  const currencies = Object.keys(budgetByCurrency);
                  const totalHours = taskEntries.reduce((total, entry) => {
                    return (
                      total +
                      (entry.endAt.getTime() - entry.startAt.getTime()) /
                        (1000 * 60 * 60)
                    );
                  }, 0);

                  return (
                    <div key={key} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{taskType.name}</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            {taskType.description}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-semibold">
                            {currencies.length === 0
                              ? "No rates"
                              : currencies.length === 1
                                ? props.services.formatService.financial.amount(
                                    budgetByCurrency[currencies[0]],
                                    currencies[0],
                                  )
                                : `${currencies.length} currencies`}
                          </div>
                          <div className="text-slate-600">
                            {taskEntries.length} entries •{" "}
                            {totalHours.toFixed(1)}h
                          </div>
                        </div>
                      </div>
                      {currencies.length > 1 && (
                        <div className="space-y-1 mt-2 pt-2 border-t border-slate-200">
                          {Object.entries(budgetByCurrency).map(
                            ([currency, amount]) => (
                              <div
                                key={currency}
                                className="flex justify-between text-xs text-slate-600"
                              >
                                <span>{currency}</span>
                                <span>
                                  {props.services.formatService.financial.amount(
                                    amount,
                                    currency,
                                  )}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  );
                },
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
              {Object.entries(props.report.data.definitions.activityTypes).map(
                ([key, activityType]) => {
                  // Find all time entries for this activity type
                  const activityEntries = props.report.data.timeEntries.filter(
                    (entry) => entry.activityId === key,
                  );

                  // Calculate budget for this activity type
                  const budgetByCurrency = activityEntries.reduce(
                    (acc, entry) => {
                      const roleType =
                        props.report.data.definitions.roleTypes[entry.roleId];
                      if (!roleType || roleType.rates.length === 0) return acc;

                      const matchingRate =
                        roleType.rates.find(
                          (rate) =>
                            rate.activityType === entry.activityId &&
                            rate.taskType === entry.taskId,
                        ) || roleType.rates[0];

                      const hours =
                        (entry.endAt.getTime() - entry.startAt.getTime()) /
                        (1000 * 60 * 60);
                      const cost = hours * matchingRate.rate;
                      const currency = matchingRate.currency;

                      if (!acc[currency]) acc[currency] = 0;
                      acc[currency] += cost;
                      return acc;
                    },
                    {} as Record<string, number>,
                  );

                  const currencies = Object.keys(budgetByCurrency);
                  const totalHours = activityEntries.reduce((total, entry) => {
                    return (
                      total +
                      (entry.endAt.getTime() - entry.startAt.getTime()) /
                        (1000 * 60 * 60)
                    );
                  }, 0);

                  return (
                    <div key={key} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{activityType.name}</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            {activityType.description}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-semibold">
                            {currencies.length === 0
                              ? "No rates"
                              : currencies.length === 1
                                ? props.services.formatService.financial.amount(
                                    budgetByCurrency[currencies[0]],
                                    currencies[0],
                                  )
                                : `${currencies.length} currencies`}
                          </div>
                          <div className="text-slate-600">
                            {activityEntries.length} entries •{" "}
                            {totalHours.toFixed(1)}h
                          </div>
                        </div>
                      </div>
                      {currencies.length > 1 && (
                        <div className="space-y-1 mt-2 pt-2 border-t border-slate-200">
                          {Object.entries(budgetByCurrency).map(
                            ([currency, amount]) => (
                              <div
                                key={currency}
                                className="flex justify-between text-xs text-slate-600"
                              >
                                <span>{currency}</span>
                                <span>
                                  {props.services.formatService.financial.amount(
                                    amount,
                                    currency,
                                  )}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  );
                },
              )}
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
