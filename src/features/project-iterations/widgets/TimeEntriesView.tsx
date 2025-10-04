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
import { ExchangeService } from "@/services/ExchangeService/ExchangeService.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { rd } from "@passionware/monads";

// Helper function to calculate approximate total in EUR when multiple currencies exist
function calculateApproximateTotal(
  budgetByCurrency: Record<string, number>,
  exchangeService: ExchangeService,
): number | null {
  const currencies = Object.keys(budgetByCurrency);
  if (currencies.length <= 1) return null;

  let totalEUR = 0;
  let hasAllRates = true;

  for (const [currency, amount] of Object.entries(budgetByCurrency)) {
    if (currency === "EUR") {
      totalEUR += amount;
    } else {
      try {
        const converted = exchangeService.convertCurrencyValue(
          { amount, currency },
          "EUR",
        );
        totalEUR += converted.amount;
      } catch {
        hasAllRates = false;
        break;
      }
    }
  }

  return hasAllRates ? totalEUR : null;
}

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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                // Group by currency and format
                const budgetByCurrency = report.data.timeEntries.reduce(
                  (acc, entry) => {
                    const roleType =
                      report.data.definitions.roleTypes[entry.roleId];
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
                  return `${budgetByCurrency[currency].toFixed(0)} ${currency}`;
                }

                // Multiple currencies - show approximate total in EUR
                const approximateTotal = calculateApproximateTotal(
                  budgetByCurrency,
                  props.services.exchangeService,
                );
                if (approximateTotal !== null) {
                  return `≈${approximateTotal.toFixed(0)} EUR`;
                }

                return `${currencies.length} currencies`;
              })()}
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
              {Object.entries(report.data.definitions.roleTypes).map(
                ([roleId, roleType]) => {
                  const roleEntries = report.data.timeEntries.filter(
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
                    <Card key={roleId} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">
                            {roleType.name}
                          </h4>
                          <div className="text-xs text-slate-600">
                            {roleEntries.length} entries •{" "}
                            {totalHours.toFixed(1)}h
                          </div>
                          <div className="text-sm font-semibold">
                            {currencies.length === 0
                              ? "No rates"
                              : currencies.length === 1
                                ? `${budgetByCurrency[currencies[0]].toFixed(0)} ${currencies[0]}`
                                : (() => {
                                    const approximateTotal =
                                      calculateApproximateTotal(
                                        budgetByCurrency,
                                        props.services.exchangeService,
                                      );
                                    if (approximateTotal !== null) {
                                      return `≈${approximateTotal.toFixed(0)} EUR`;
                                    }
                                    return `${currencies.length} currencies`;
                                  })()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                },
              )}
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
              {(() => {
                // Group entries by contractorId
                const entriesByContractor = report.data.timeEntries.reduce(
                  (acc, entry) => {
                    const contractorId = entry.contractorId;
                    if (!acc[contractorId]) acc[contractorId] = [];
                    acc[contractorId].push(entry);
                    return acc;
                  },
                  {} as Record<number, typeof report.data.timeEntries>,
                );

                return Object.entries(entriesByContractor).map(
                  ([contractorId, entries]) => {
                    const budgetByCurrency = entries.reduce(
                      (acc, entry) => {
                        const roleType =
                          report.data.definitions.roleTypes[entry.roleId];
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
                      <Card
                        key={contractorId}
                        className="border-l-4 border-l-green-500"
                      >
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">
                              Contractor #{contractorId}
                            </h4>
                            <div className="text-xs text-slate-600">
                              {entries.length} entries • {totalHours.toFixed(1)}
                              h
                            </div>
                            <div className="text-sm font-semibold">
                              {currencies.length === 0
                                ? "No rates"
                                : currencies.length === 1
                                  ? `${budgetByCurrency[currencies[0]].toFixed(0)} ${currencies[0]}`
                                  : (() => {
                                      const approximateTotal =
                                        calculateApproximateTotal(
                                          budgetByCurrency,
                                          props.services.exchangeService,
                                        );
                                      if (approximateTotal !== null) {
                                        return `≈${approximateTotal.toFixed(0)} EUR`;
                                      }
                                      return `${currencies.length} currencies`;
                                    })()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
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
