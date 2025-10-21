import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { CostToBillingWidget } from "@/features/_common/CostToBillingWidget.tsx";
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget.tsx";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView";
import { renderError } from "@/features/_common/renderError.tsx";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { maybe, rd, RemoteData } from "@passionware/monads";
import { ArrowRight, Database, FileText } from "lucide-react";
import { Route, Routes } from "react-router-dom";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { GeneratedReportTabs } from "./GeneratedReportHeader";
import { TimeEntriesView } from "./TimeEntriesView";

function BudgetPieChart(
  services: WithFrontServices["services"],
  props2: {
    title: string;
    description?: string;
    items: { name: string; budget: { amount: number; currency: string }[] }[];
    height?: number;
    showLabels?: boolean;
  },
) {
  const targetCurrency = "EUR";
  const allCurrencies = Array.from(
    new Set(
      props2.items.flatMap((it) =>
        it.budget.map((b) => b.currency.toUpperCase()),
      ),
    ),
  );

  const exchangeRates = services.exchangeService.useExchangeRates(
    allCurrencies.map((from) => ({ from, to: targetCurrency })),
  );

  const colors = [
    "#6366F1",
    "#22C55E",
    "#F59E0B",
    "#EF4444",
    "#14B8A6",
    "#A855F7",
    "#3B82F6",
    "#F97316",
    "#84CC16",
    "#06B6D4",
  ];

  const data =
    rd.tryMap(exchangeRates, (rates) => {
      const rateMap = new Map<string, number>();
      rates.forEach((r) =>
        rateMap.set(`${r.from.toUpperCase()}->${r.to.toUpperCase()}`, r.rate),
      );

      const raw = props2.items
        .map((it) => {
          const value = it.budget.reduce((sum, b) => {
            const key = `${b.currency.toUpperCase()}->${targetCurrency}`;
            const rate = rateMap.get(key) ?? 0;
            return sum + b.amount * rate;
          }, 0);
          return { name: it.name, value };
        })
        .filter((d) => d.value > 0);

      // Aggregate small slices into "Others" to avoid overflows
      const maxSlices = 12;
      if (raw.length <= maxSlices) return raw;
      const sorted = [...raw].sort((a, b) => b.value - a.value);
      const head = sorted.slice(0, maxSlices - 1);
      const tailSum = sorted
        .slice(maxSlices - 1)
        .reduce((s, x) => s + x.value, 0);
      return [...head, { name: "Others", value: tailSum }];
    }) || [];

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{props2.title}</CardTitle>
          {props2.description ? (
            <CardDescription>{props2.description}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="text-sm text-slate-600">No data</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{props2.title}</CardTitle>
        {props2.description ? (
          <CardDescription>{props2.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent style={{ height: props2.height ?? 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <RechartsTooltip
              formatter={(value: number) =>
                services.formatService.financial.currency({
                  amount: value,
                  currency: targetCurrency,
                })
              }
            />
            {(() => {
              const showLegend = data.length <= 12;
              if (!showLegend) return null;
              return (
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{ maxHeight: 180, overflowY: "auto" }}
                  formatter={(value: string) =>
                    value.length > 18 ? `${value.slice(0, 18)}…` : value
                  }
                />
              );
            })()}
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={80}
              labelLine={false}
              paddingAngle={1}
              label={(() => {
                const maxLabeledSlices = 8;
                const allowLabels =
                  props2.showLabels && data.length <= maxLabeledSlices;
                if (!allowLabels) return false as const;
                const truncate = (text: string) =>
                  text.length > 18 ? `${text.slice(0, 18)}…` : text;
                return (entry: { name: string }) => truncate(entry.name);
              })()}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function BudgetPieThumb(
  services: WithFrontServices["services"],
  props2: {
    items: { name: string; budget: { amount: number; currency: string }[] }[];
    size?: number; // px
  },
) {
  const targetCurrency = "EUR";
  const allCurrencies = Array.from(
    new Set(
      props2.items.flatMap((it) =>
        it.budget.map((b) => b.currency.toUpperCase()),
      ),
    ),
  );

  const exchangeRates = services.exchangeService.useExchangeRates(
    allCurrencies.map((from) => ({ from, to: targetCurrency })),
  );

  const colors = [
    "#6366F1",
    "#22C55E",
    "#F59E0B",
    "#EF4444",
    "#14B8A6",
    "#A855F7",
    "#3B82F6",
    "#F97316",
  ];

  const data =
    rd.tryMap(exchangeRates, (rates) => {
      const rateMap = new Map<string, number>();
      rates.forEach((r) =>
        rateMap.set(`${r.from.toUpperCase()}->${r.to.toUpperCase()}`, r.rate),
      );
      return props2.items
        .map((it) => {
          const value = it.budget.reduce((sum, b) => {
            const key = `${b.currency.toUpperCase()}->${targetCurrency}`;
            const rate = rateMap.get(key) ?? 0;
            return sum + b.amount * rate;
          }, 0);
          return { name: it.name, value };
        })
        .filter((d) => d.value > 0);
    }) || [];

  const size = props2.size ?? 96;

  return (
    <div style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius={size / 2.6}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-thumb-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

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
        {/* Basic Information & Time Range */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Report Information
            </CardTitle>
            <CardDescription>
              Report metadata and time period details
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
            {/* Cost vs Billing quick viz */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cost → Billing</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    <CurrencyValueWidget
                      values={basicInfo.statistics.totalCostBudget}
                      services={props.services}
                      exchangeService={props.services.exchangeService}
                      className="text-inherit"
                    />
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                  <Badge variant="primary">
                    <CurrencyValueWidget
                      values={basicInfo.statistics.totalBillingBudget}
                      services={props.services}
                      exchangeService={props.services.exchangeService}
                      className="text-inherit"
                    />
                  </Badge>
                  {/* Percentage now computed inside CostToBillingWidget when needed */}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Earnings</span>
                <Badge variant="secondary">
                  <CurrencyValueWidget
                    values={basicInfo.statistics.totalEarningsBudget}
                    services={props.services}
                    exchangeService={props.services.exchangeService}
                    className="text-inherit"
                  />
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contractors */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Contractors</CardTitle>
                <CardDescription>Cost breakdown by contractor</CardDescription>
              </div>
              {(() => {
                const contractorsSummary =
                  props.services.generatedReportViewService.getContractorsSummaryView(
                    props.report,
                  );

                // Fetch contractor details for all contractors
                const contractorIds = contractorsSummary.contractors.map(
                  (c) => c.contractorId,
                );
                const contractorsQuery =
                  props.services.contractorService.useContractors(
                    contractorQueryUtils.getBuilder().build((q) => [
                      q.withFilter("id", {
                        operator: "oneOf",
                        value: contractorIds,
                      }),
                    ]),
                  );

                return (
                  rd.tryMap(contractorsQuery, (contractors) => {
                    // Create a map for quick lookup
                    const contractorMap = new Map(
                      contractors.map((c) => [c.id, c]),
                    );

                    return (
                      <Dialog>
                        <DialogTrigger asChild>
                          <div className="cursor-pointer select-none">
                            {BudgetPieThumb(props.services, {
                              items: contractorsSummary.contractors.map(
                                (c) => ({
                                  name:
                                    contractorMap.get(c.contractorId)
                                      ?.fullName ||
                                    `Contractor #${c.contractorId}`,
                                  budget: c.costBudget,
                                }),
                              ),
                              size: 64,
                            })}
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>Budget by Contractor</DialogTitle>
                            <DialogDescription>
                              Approximate in EUR
                            </DialogDescription>
                          </DialogHeader>
                          {BudgetPieChart(props.services, {
                            title: "Budget by Contractor",
                            description: "Approximate in EUR",
                            items: contractorsSummary.contractors.map((c) => ({
                              name:
                                contractorMap.get(c.contractorId)?.fullName ||
                                `Contractor #${c.contractorId}`,
                              budget: c.costBudget,
                            })),
                            height: 360,
                            showLabels: true,
                          })}
                        </DialogContent>
                      </Dialog>
                    );
                  }) || (
                    // Fallback while loading
                    <Dialog>
                      <DialogTrigger asChild>
                        <div className="cursor-pointer select-none">
                          {BudgetPieThumb(props.services, {
                            items: contractorsSummary.contractors.map((c) => ({
                              name: `Contractor #${c.contractorId}`,
                              budget: c.costBudget,
                            })),
                            size: 64,
                          })}
                        </div>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Budget by Contractor</DialogTitle>
                          <DialogDescription>
                            Approximate in EUR
                          </DialogDescription>
                        </DialogHeader>
                        {BudgetPieChart(props.services, {
                          title: "Budget by Contractor",
                          description: "Approximate in EUR",
                          items: contractorsSummary.contractors.map((c) => ({
                            name: `Contractor #${c.contractorId}`,
                            budget: c.costBudget,
                          })),
                          height: 360,
                          showLabels: true,
                        })}
                      </DialogContent>
                    </Dialog>
                  )
                );
              })()}
            </div>
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
                      <div className="text-right text-sm space-y-1">
                        <div className="font-semibold">
                          {contractor.costBudget.length === 0 ? (
                            "No rates"
                          ) : (
                            <CostToBillingWidget
                              cost={contractor.costBudget}
                              billing={contractor.billingBudget}
                              services={props.services}
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
                      {contractor.costBudget.map((currencyValue, index) => (
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

      {/* Quick Visualizations + Budget Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Types */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Activity Types</CardTitle>
                <CardDescription>
                  Available activity types in this report
                </CardDescription>
              </div>
              {(() => {
                const activityTypesSummary =
                  props.services.generatedReportViewService.getActivityTypesSummaryView(
                    props.report,
                  );
                return (
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="cursor-pointer select-none">
                        {BudgetPieThumb(props.services, {
                          items: activityTypesSummary.activityTypes.map(
                            (a) => ({
                              name: a.name,
                              budget: a.costBudget,
                            }),
                          ),
                          size: 64,
                        })}
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Budget by Activity Type</DialogTitle>
                        <DialogDescription>
                          Approximate in EUR
                        </DialogDescription>
                      </DialogHeader>
                      {BudgetPieChart(props.services, {
                        title: "Budget by Activity Type",
                        description: "Approximate in EUR",
                        items: activityTypesSummary.activityTypes.map((a) => ({
                          name: a.name,
                          budget: a.costBudget,
                        })),
                        height: 360,
                        showLabels: true,
                      })}
                    </DialogContent>
                  </Dialog>
                );
              })()}
            </div>
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
                          <div className="text-right text-sm space-y-1">
                            <div className="font-semibold">
                              {activityType.costBudget.length === 0 ? (
                                "No rates"
                              ) : (
                                <CostToBillingWidget
                                  cost={activityType.costBudget}
                                  billing={activityType.billingBudget}
                                  services={props.services}
                                />
                              )}
                            </div>
                            <div className="text-slate-600">
                              {activityType.entriesCount} entries •{" "}
                              {activityType.totalHours.toFixed(1)}h
                            </div>
                          </div>
                        </div>
                        {activityType.costBudget.length > 1 && (
                          <div className="space-y-1 mt-2 pt-2 border-t border-slate-200">
                            {activityType.costBudget.map(
                              (currencyValue, index) => (
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
                              ),
                            )}
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
        {/* Budget by Project */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Projects</CardTitle>
                <CardDescription>
                  Projects represent client-facing budget categories. Each
                  project has its own budget and can span multiple roles.
                </CardDescription>
              </div>
              {(() => {
                const projectsSummary =
                  props.services.generatedReportViewService.getProjectsSummaryView(
                    props.report,
                  );
                return (
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="cursor-pointer select-none">
                        {BudgetPieThumb(props.services, {
                          items: projectsSummary.projects.map((p) => ({
                            name: p.name,
                            budget: p.costBudget,
                          })),
                          size: 64,
                        })}
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Budget by Project</DialogTitle>
                        <DialogDescription>
                          Approximate in EUR
                        </DialogDescription>
                      </DialogHeader>
                      {BudgetPieChart(props.services, {
                        title: "Budget by Project",
                        description: "Approximate in EUR",
                        items: projectsSummary.projects.map((p) => ({
                          name: p.name,
                          budget: p.costBudget,
                        })),
                        height: 360,
                        showLabels: true,
                      })}
                    </DialogContent>
                  </Dialog>
                );
              })()}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(() => {
                const projectsSummary =
                  props.services.generatedReportViewService.getProjectsSummaryView(
                    props.report,
                  );
                return projectsSummary.projects.map((project) => {
                  if (project.entriesCount === 0) return null;

                  return (
                    <div
                      key={project.projectId}
                      className="p-3 border rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{project.name}</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            {project.description}
                          </p>
                        </div>
                        <div className="text-right text-sm space-y-1">
                          <div className="font-semibold">
                            {project.costBudget.length === 0 ? (
                              "No rates"
                            ) : (
                              <CostToBillingWidget
                                cost={project.costBudget}
                                billing={project.billingBudget}
                                services={props.services}
                              />
                            )}
                          </div>
                          <div className="text-slate-600">
                            {project.entriesCount} entries •{" "}
                            {project.totalHours.toFixed(1)}h
                          </div>
                          {project.budgetCap && (
                            <div className="text-xs text-slate-500">
                              Cap:{" "}
                              {props.services.formatService.financial.currency(
                                project.budgetCap,
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
        {/* Budget by Role */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Roles</CardTitle>
                <CardDescription>
                  Roles are independent of contractors. Contractors may have
                  multiple roles.
                </CardDescription>
              </div>
              {(() => {
                const rolesSummary =
                  props.services.generatedReportViewService.getRolesSummaryView(
                    props.report,
                  );
                return (
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="cursor-pointer select-none">
                        {BudgetPieThumb(props.services, {
                          items: rolesSummary.roles.map((r) => ({
                            name: r.name,
                            budget: r.costBudget,
                          })),
                          size: 64,
                        })}
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Budget by Role</DialogTitle>
                        <DialogDescription>
                          Approximate in EUR
                        </DialogDescription>
                      </DialogHeader>
                      {BudgetPieChart(props.services, {
                        title: "Budget by Role",
                        description: "Approximate in EUR",
                        items: rolesSummary.roles.map((r) => ({
                          name: r.name,
                          budget: r.costBudget,
                        })),
                        height: 360,
                        showLabels: true,
                      })}
                    </DialogContent>
                  </Dialog>
                );
              })()}
            </div>
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
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{role.name}</h4>
                          {role.rates.length > 0 && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer select-none">
                                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
                                    <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                                    <span className="text-xs text-slate-600">
                                      {role.rates.length} rates
                                    </span>
                                  </div>
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <PopoverHeader>
                                  Rate Definitions for {role.name}
                                </PopoverHeader>
                                <div className="space-y-3">
                                  {role.rates.map((rate, index) => (
                                    <div
                                      key={index}
                                      className="p-3 border rounded-lg bg-slate-50"
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <div className="font-medium text-sm">
                                            {rate.activityType} -{" "}
                                            {rate.taskType}
                                          </div>
                                          {rate.projectId && (
                                            <div className="text-xs text-slate-500 mt-1">
                                              Project: {rate.projectId}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                          <div className="text-slate-500 mb-1">
                                            Cost Rate
                                          </div>
                                          <div className="font-medium">
                                            {props.services.formatService.financial.amount(
                                              rate.costRate,
                                              rate.costCurrency,
                                            )}
                                            /h
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-slate-500 mb-1">
                                            Billing Rate
                                          </div>
                                          <div className="font-medium">
                                            {props.services.formatService.financial.amount(
                                              rate.billingRate,
                                              rate.billingCurrency,
                                            )}
                                            /h
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        <div className="text-right text-sm space-y-1">
                          <div className="font-semibold">
                            {role.costBudget.length === 0 ? (
                              "No rates"
                            ) : (
                              <CostToBillingWidget
                                cost={role.costBudget}
                                billing={role.billingBudget}
                                services={props.services}
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
                              {rate.projectId && ` (${rate.projectId})`}
                            </span>
                            <span>
                              {props.services.formatService.financial.amount(
                                rate.costRate,
                                rate.costCurrency,
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
      </div>

      {/* Types Grid - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {/* Task Types */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Task Types</CardTitle>
                <CardDescription>
                  Available task types in this report
                </CardDescription>
              </div>
              {(() => {
                const taskTypesSummary =
                  props.services.generatedReportViewService.getTaskTypesSummaryView(
                    props.report,
                  );
                return (
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="cursor-pointer select-none">
                        {BudgetPieThumb(props.services, {
                          items: taskTypesSummary.taskTypes.map((t) => ({
                            name: t.name,
                            budget: t.costBudget,
                          })),
                          size: 64,
                        })}
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Budget by Task Type</DialogTitle>
                        <DialogDescription>
                          Approximate in EUR
                        </DialogDescription>
                      </DialogHeader>
                      {BudgetPieChart(props.services, {
                        title: "Budget by Task Type",
                        description: "Approximate in EUR",
                        items: taskTypesSummary.taskTypes.map((t) => ({
                          name: t.name,
                          budget: t.costBudget,
                        })),
                        height: 360,
                        showLabels: true,
                      })}
                    </DialogContent>
                  </Dialog>
                );
              })()}
            </div>
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
                        <div className="text-right text-sm space-y-1">
                          <div className="font-semibold">
                            {taskType.costBudget.length === 0 ? (
                              "No rates"
                            ) : (
                              <CostToBillingWidget
                                cost={taskType.costBudget}
                                billing={taskType.billingBudget}
                                services={props.services}
                              />
                            )}
                          </div>
                          <div className="text-slate-600">
                            {taskType.entriesCount} entries •{" "}
                            {taskType.totalHours.toFixed(1)}h
                          </div>
                        </div>
                      </div>
                      {taskType.costBudget.length > 1 && (
                        <div className="space-y-1 mt-2 pt-2 border-t border-slate-200">
                          {taskType.costBudget.map((currencyValue, index) => (
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
// todo: maybe we should also introduce a 'project' - also breakdown by project (ongoing, in-app-payment) etc - so we can make triggers later
