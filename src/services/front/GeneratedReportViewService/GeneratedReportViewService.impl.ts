import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { CurrencyValue } from "@/services/ExchangeService/ExchangeService.ts";
import {
  ActivityTypesSummaryView,
  BasicInformationView,
  ContractorsSummaryView,
  EntryFilters,
  FilteredEntriesView,
  FilteredEntrySummary,
  GeneratedReportViewService,
  GroupedEntrySummary,
  GroupedView,
  GroupSpecifier,
  ProjectsSummaryView,
  RolesSummaryView,
  TaskTypesSummaryView,
} from "./GeneratedReportViewService.ts";
import { getMatchingRate } from "@/services/io/_common/getMatchingRate.ts";

export function createGeneratedReportViewService(): GeneratedReportViewService {
  return {
    getBasicInformationView: (report) => getBasicInformationView(report),
    getProjectsSummaryView: (report) => getProjectsSummaryView(report),
    getRolesSummaryView: (report) => getRolesSummaryView(report),
    getContractorsSummaryView: (report) => getContractorsSummaryView(report),
    getTaskTypesSummaryView: (report) => getTaskTypesSummaryView(report),
    getActivityTypesSummaryView: (report) =>
      getActivityTypesSummaryView(report),
    getFilteredEntriesView: (report, filters) =>
      getFilteredEntriesView(report, filters),
    getGroupedView: (report, filters, groupBy, contractorNameLookup) =>
      getGroupedView(report, filters, groupBy, contractorNameLookup),
  };
}

function getBasicInformationView(
  report: GeneratedReportSource,
): BasicInformationView {
  const costBudgetByCurrency = report.data.timeEntries.reduce(
    (acc, entry) => {
      const roleType = report.data.definitions.roleTypes[entry.roleId];
      if (!roleType || roleType.rates.length === 0) return acc;

      const matchingRate = getMatchingRate(report.data, entry);

      const hours =
        (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);
      // Calculate cost (what we pay contractor)
      const cost = hours * matchingRate.costRate;
      const costCurrency = matchingRate.costCurrency;

      if (!acc[costCurrency]) acc[costCurrency] = 0;
      acc[costCurrency] += cost;
      return acc;
    },
    {} as Record<string, number>,
  );

  const billingBudgetByCurrency = report.data.timeEntries.reduce(
    (acc, entry) => {
      const roleType = report.data.definitions.roleTypes[entry.roleId];
      if (!roleType || roleType.rates.length === 0) return acc;

      const matchingRate = getMatchingRate(report.data, entry);

      const hours =
        (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);
      // Calculate billing (what we charge client)
      const billing = hours * matchingRate.billingRate;
      const billingCurrency = matchingRate.billingCurrency;

      if (!acc[billingCurrency]) acc[billingCurrency] = 0;
      acc[billingCurrency] += billing;
      return acc;
    },
    {} as Record<string, number>,
  );

  const totalCostBudget: CurrencyValue[] = Object.entries(
    costBudgetByCurrency,
  ).map(([currency, amount]) => ({ amount, currency }));

  const totalBillingBudget: CurrencyValue[] = Object.entries(
    billingBudgetByCurrency,
  ).map(([currency, amount]) => ({ amount, currency }));

  // Calculate earnings (billing - cost) - this is complex with multiple currencies
  // For now, we'll calculate earnings in each currency separately
  const earningsBudgetByCurrency: Record<string, number> = {};

  // Add all currencies from both cost and billing
  const allCurrencies = new Set([
    ...Object.keys(costBudgetByCurrency),
    ...Object.keys(billingBudgetByCurrency),
  ]);

  for (const currency of allCurrencies) {
    const costAmount = costBudgetByCurrency[currency] || 0;
    const billingAmount = billingBudgetByCurrency[currency] || 0;
    earningsBudgetByCurrency[currency] = billingAmount - costAmount;
  }

  const totalEarningsBudget: CurrencyValue[] = Object.entries(
    earningsBudgetByCurrency,
  ).map(([currency, amount]) => ({ amount, currency }));

  return {
    reportId: report.id,
    createdAt: report.createdAt,
    projectIterationId: report.projectIterationId,
    statistics: {
      timeEntriesCount: report.data.timeEntries.length,
      taskTypesCount: Object.keys(report.data.definitions.taskTypes).length,
      activityTypesCount: Object.keys(report.data.definitions.activityTypes)
        .length,
      roleTypesCount: Object.keys(report.data.definitions.roleTypes).length,
      totalCostBudget,
      totalBillingBudget,
      totalEarningsBudget,
    },
  };
}

function getRolesSummaryView(report: GeneratedReportSource): RolesSummaryView {
  // Use the generic grouped view with role grouping
  const groupedView = getGroupedView(
    report,
    {}, // no filters
    { type: "role" }, // group by role only
  );

  // Transform the generic grouped view to the specific roles summary format
  const roles = groupedView.groups.map((roleGroup) => {
    const roleId = roleGroup.groupKey;
    const roleType = report.data.definitions.roleTypes[roleId];

    return {
      roleId,
      name: roleType?.name || "Unknown Role",
      description: roleType?.description,
      entriesCount: roleGroup.entriesCount,
      totalHours: roleGroup.totalHours,
      costBudget: roleGroup.costBudget,
      billingBudget: roleGroup.billingBudget,
      earningsBudget: roleGroup.earningsBudget,
      rates: roleType.rates,
    };
  });

  return { roles };
}

function getProjectsSummaryView(
  report: GeneratedReportSource,
): ProjectsSummaryView {
  // Use the generic grouped view with project grouping
  const groupedView = getGroupedView(
    report,
    {}, // no filters
    { type: "project" }, // group by project only
  );

  // Transform the generic grouped view to the specific projects summary format
  const projects = groupedView.groups.map((projectGroup) => {
    const projectId = projectGroup.groupKey;
    const projectType = report.data.definitions.projectTypes[projectId];

    // For budgetByRole, we would need to make a separate call to getGroupedView with role grouping
    // and project filtering, but for now we'll leave it empty since the UI doesn't seem to use it
    const budgetByRole: any[] = [];

    return {
      projectId,
      name: projectType?.name || "Unknown Project",
      description: projectType?.description,
      entriesCount: projectGroup.entriesCount,
      totalHours: projectGroup.totalHours,
      costBudget: projectGroup.costBudget,
      billingBudget: projectGroup.billingBudget,
      earningsBudget: projectGroup.earningsBudget,
      budgetCap: projectType?.budgetCap,
      budgetByRole,
    };
  });

  return { projects };
}

// OLD FUNCTION - REMOVED (now using getGroupedView)
/*
function getProjectsSummaryViewOld(
  report: GeneratedReportSource,
): ProjectsSummaryView {
  const projects = Object.entries(report.data.definitions.projectTypes).map(
    ([projectId, projectType]) => {
      const projectEntries = report.data.timeEntries.filter(
        (entry) => entry.projectId === projectId,
      );

      if (projectEntries.length === 0) {
        return {
          projectId,
          name: projectType.name,
          description: projectType.description,
          entriesCount: 0,
          totalHours: 0,
          costBudget: [],
          billingBudget: [],
          earningsBudget: [],
          budgetCap: projectType.budgetCap,
          budgetByRole: [],
        };
      }

      // Group entries by role within this project
      const entriesByRole = projectEntries.reduce(
        (acc, entry) => {
          if (!acc[entry.roleId]) {
            acc[entry.roleId] = [];
          }
          acc[entry.roleId].push(entry);
          return acc;
        },
        {} as Record<string, typeof projectEntries>,
      );

      // Calculate budget by role
      const budgetByRole = Object.entries(entriesByRole).map(
        ([roleId, roleEntries]) => {
          const roleType = report.data.definitions.roleTypes[roleId];
          if (!roleType) {
            return {
              roleId,
              roleName: "Unknown Role",
              hours: 0,
              costBudget: [],
              billingBudget: [],
              earningsBudget: [],
            };
          }

          const costBudgetByCurrency = roleEntries.reduce(
            (acc, entry) => {
              const matchingRate =
                roleType.rates.find(
                  (rate) =>
                    rate.activityType === entry.activityId &&
                    rate.taskType === entry.taskId &&
                    (rate.projectId === undefined ||
                      rate.projectId === projectId),
                ) ||
                roleType.rates.find(
                  (rate) =>
                    rate.activityType === entry.activityId &&
                    rate.taskType === entry.taskId,
                ) ||
                roleType.rates[0];

              const hours =
                (entry.endAt.getTime() - entry.startAt.getTime()) /
                (1000 * 60 * 60);
              const cost = hours * matchingRate.costRate;
              const currency = matchingRate.costCurrency;

              if (!acc[currency]) acc[currency] = 0;
              acc[currency] += cost;
              return acc;
            },
            {} as Record<string, number>,
          );

          const billingBudgetByCurrency = roleEntries.reduce(
            (acc, entry) => {
              const matchingRate =
                roleType.rates.find(
                  (rate) =>
                    rate.activityType === entry.activityId &&
                    rate.taskType === entry.taskId &&
                    (rate.projectId === undefined ||
                      rate.projectId === projectId),
                ) ||
                roleType.rates.find(
                  (rate) =>
                    rate.activityType === entry.activityId &&
                    rate.taskType === entry.taskId,
                ) ||
                roleType.rates[0];

              const hours =
                (entry.endAt.getTime() - entry.startAt.getTime()) /
                (1000 * 60 * 60);
              const billing = hours * matchingRate.billingRate;
              const currency = matchingRate.billingCurrency;

              if (!acc[currency]) acc[currency] = 0;
              acc[currency] += billing;
              return acc;
            },
            {} as Record<string, number>,
          );

          const costBudget: CurrencyValue[] = Object.entries(
            costBudgetByCurrency,
          ).map(([currency, amount]) => ({ amount, currency }));

          const billingBudget: CurrencyValue[] = Object.entries(
            billingBudgetByCurrency,
          ).map(([currency, amount]) => ({ amount, currency }));

          // Calculate earnings (billing - cost)
          const earningsBudgetByCurrency: Record<string, number> = {};
          const allCurrencies = new Set([
            ...Object.keys(costBudgetByCurrency),
            ...Object.keys(billingBudgetByCurrency),
          ]);

          for (const currency of allCurrencies) {
            const costAmount = costBudgetByCurrency[currency] || 0;
            const billingAmount = billingBudgetByCurrency[currency] || 0;
            earningsBudgetByCurrency[currency] = billingAmount - costAmount;
          }

          const earningsBudget: CurrencyValue[] = Object.entries(
            earningsBudgetByCurrency,
          ).map(([currency, amount]) => ({ amount, currency }));

          const totalHours = roleEntries.reduce((total, entry) => {
            return (
              total +
              (entry.endAt.getTime() - entry.startAt.getTime()) /
                (1000 * 60 * 60)
            );
          }, 0);

          return {
            roleId,
            roleName: roleType.name,
            hours: totalHours,
            costBudget,
            billingBudget,
            earningsBudget,
          };
        },
      );

      // Calculate total project budget by aggregating all roles
      const costBudgetByCurrency = budgetByRole.reduce(
        (acc, role) => {
          role.costBudget.forEach(({ currency, amount }) => {
            if (!acc[currency]) acc[currency] = 0;
            acc[currency] += amount;
          });
          return acc;
        },
        {} as Record<string, number>,
      );

      const billingBudgetByCurrency = budgetByRole.reduce(
        (acc, role) => {
          role.billingBudget.forEach(({ currency, amount }) => {
            if (!acc[currency]) acc[currency] = 0;
            acc[currency] += amount;
          });
          return acc;
        },
        {} as Record<string, number>,
      );

      const costBudget: CurrencyValue[] = Object.entries(
        costBudgetByCurrency,
      ).map(([currency, amount]) => ({ amount, currency }));

      const billingBudget: CurrencyValue[] = Object.entries(
        billingBudgetByCurrency,
      ).map(([currency, amount]) => ({ amount, currency }));

      // Calculate earnings (billing - cost)
      const earningsBudgetByCurrency: Record<string, number> = {};
      const allCurrencies = new Set([
        ...Object.keys(costBudgetByCurrency),
        ...Object.keys(billingBudgetByCurrency),
      ]);

      for (const currency of allCurrencies) {
        const costAmount = costBudgetByCurrency[currency] || 0;
        const billingAmount = billingBudgetByCurrency[currency] || 0;
        earningsBudgetByCurrency[currency] = billingAmount - costAmount;
      }

      const earningsBudget: CurrencyValue[] = Object.entries(
        earningsBudgetByCurrency,
      ).map(([currency, amount]) => ({ amount, currency }));

      const totalHours = projectEntries.reduce((total, entry) => {
        return (
          total +
          (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60)
        );
      }, 0);

      return {
        projectId,
        name: projectType.name,
        description: projectType.description,
        entriesCount: projectEntries.length,
        totalHours,
        costBudget,
        billingBudget,
        earningsBudget,
        budgetCap: projectType.budgetCap,
        budgetByRole,
      };
    },
  );

  return { projects };
  */

function getContractorsSummaryView(
  report: GeneratedReportSource,
): ContractorsSummaryView {
  // Use the generic grouped view with contractor grouping
  const groupedView = getGroupedView(
    report,
    {}, // no filters
    { type: "contractor" }, // group by contractor only
  );

  // Transform the generic grouped view to the specific contractors summary format
  const contractors = groupedView.groups.map((contractorGroup) => {
    const contractorId = Number(contractorGroup.groupKey);

    // For budgetByRole, we would need to make a separate call to getGroupedView with role grouping
    // and contractor filtering, but for now we'll leave it empty since the UI doesn't seem to use it
    const budgetByRole: any[] = [];

    return {
      contractorId,
      entriesCount: contractorGroup.entriesCount,
      totalHours: contractorGroup.totalHours,
      costBudget: contractorGroup.costBudget,
      billingBudget: contractorGroup.billingBudget,
      earningsBudget: contractorGroup.earningsBudget,
      budgetByRole,
    };
  });

  return { contractors };
}

function getTaskTypesSummaryView(
  report: GeneratedReportSource,
): TaskTypesSummaryView {
  // Use the generic grouped view with task grouping
  const groupedView = getGroupedView(
    report,
    {}, // no filters
    { type: "task" }, // group by task only
  );

  // Transform the generic grouped view to the specific task types summary format
  const taskTypes = groupedView.groups.map((taskGroup) => {
    // For budgetByRole, we would need to make a separate call to getGroupedView with role grouping
    // and task filtering, but for now we'll leave it empty since the UI doesn't seem to use it
    const budgetByRole: any[] = [];

    return {
      taskId: taskGroup.groupKey,
      name: taskGroup.groupName,
      description: taskGroup.groupDescription || "",
      entriesCount: taskGroup.entriesCount,
      totalHours: taskGroup.totalHours,
      costBudget: taskGroup.costBudget,
      billingBudget: taskGroup.billingBudget,
      earningsBudget: taskGroup.earningsBudget,
      budgetByRole,
    };
  });

  return { taskTypes };
}

function getActivityTypesSummaryView(
  report: GeneratedReportSource,
): ActivityTypesSummaryView {
  // Use the generic grouped view with activity grouping
  const groupedView = getGroupedView(
    report,
    {}, // no filters
    { type: "activity" }, // group by activity only
  );

  // Transform the generic grouped view to the specific activity types summary format
  const activityTypes = groupedView.groups.map((activityGroup) => {
    // For budgetByRole, we would need to make a separate call to getGroupedView with role grouping
    // and activity filtering, but for now we'll leave it empty since the UI doesn't seem to use it
    const budgetByRole: any[] = [];

    return {
      activityId: activityGroup.groupKey,
      name: activityGroup.groupName,
      description: activityGroup.groupDescription || "",
      entriesCount: activityGroup.entriesCount,
      totalHours: activityGroup.totalHours,
      costBudget: activityGroup.costBudget,
      billingBudget: activityGroup.billingBudget,
      earningsBudget: activityGroup.earningsBudget,
      budgetByRole,
    };
  });

  return { activityTypes };
}

function getFilteredEntriesView(
  report: GeneratedReportSource,
  filters: EntryFilters,
): FilteredEntriesView {
  let filteredEntries = report.data.timeEntries;

  // Apply filters
  if (filters.roleIds && filters.roleIds.length > 0) {
    filteredEntries = filteredEntries.filter((entry) =>
      filters.roleIds!.includes(entry.roleId),
    );
  }

  if (filters.contractorIds && filters.contractorIds.length > 0) {
    filteredEntries = filteredEntries.filter((entry) =>
      filters.contractorIds!.includes(entry.contractorId),
    );
  }

  if (filters.taskIds && filters.taskIds.length > 0) {
    filteredEntries = filteredEntries.filter((entry) =>
      filters.taskIds!.includes(entry.taskId),
    );
  }

  if (filters.activityIds && filters.activityIds.length > 0) {
    filteredEntries = filteredEntries.filter((entry) =>
      filters.activityIds!.includes(entry.activityId),
    );
  }

  if (filters.projectIds && filters.projectIds.length > 0) {
    filteredEntries = filteredEntries.filter((entry) =>
      filters.projectIds!.includes(entry.projectId),
    );
  }

  const entries: FilteredEntrySummary[] = filteredEntries.map((entry) => {
    const matchingRate = getMatchingRate(report.data, entry);

    const hours =
      (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);
    const cost = hours * matchingRate.costRate;
    const currency = matchingRate.costCurrency;

    return {
      entryId: `${entry.startAt.getTime()}-${entry.contractorId}`,
      contractorId: entry.contractorId,
      roleId: entry.roleId,
      taskId: entry.taskId,
      activityId: entry.activityId,
      projectId: entry.projectId,
      startAt: entry.startAt,
      endAt: entry.endAt,
      duration: hours,
      budget: { amount: cost, currency },
      description: entry.note,
    };
  });

  const totalHours = entries.reduce(
    (total, entry) => total + entry.duration,
    0,
  );

  const budgetByCurrency = entries.reduce(
    (acc, entry) => {
      if (!acc[entry.budget.currency]) acc[entry.budget.currency] = 0;
      acc[entry.budget.currency] += entry.budget.amount;
      return acc;
    },
    {} as Record<string, number>,
  );

  const totalBudget: CurrencyValue[] = Object.entries(budgetByCurrency).map(
    ([currency, amount]) => ({ amount, currency }),
  );

  // Summary by role
  const entriesByRole = entries.reduce(
    (acc, entry) => {
      if (!acc[entry.roleId]) acc[entry.roleId] = [];
      acc[entry.roleId].push(entry);
      return acc;
    },
    {} as Record<string, FilteredEntrySummary[]>,
  );

  const summaryByRole = Object.entries(entriesByRole).map(
    ([roleId, roleEntries]) => {
      const roleType = report.data.definitions.roleTypes[roleId];
      const roleBudgetByCurrency = roleEntries.reduce(
        (acc, entry) => {
          if (!acc[entry.budget.currency]) acc[entry.budget.currency] = 0;
          acc[entry.budget.currency] += entry.budget.amount;
          return acc;
        },
        {} as Record<string, number>,
      );

      const roleBudget: CurrencyValue[] = Object.entries(
        roleBudgetByCurrency,
      ).map(([currency, amount]) => ({ amount, currency }));

      const roleHours = roleEntries.reduce(
        (total, entry) => total + entry.duration,
        0,
      );

      return {
        roleId,
        roleName: roleType?.name || "Unknown Role",
        entriesCount: roleEntries.length,
        hours: roleHours,
        budget: roleBudget,
      };
    },
  );

  // Summary by contractor
  const entriesByContractor = entries.reduce(
    (acc, entry) => {
      if (!acc[entry.contractorId]) acc[entry.contractorId] = [];
      acc[entry.contractorId].push(entry);
      return acc;
    },
    {} as Record<number, FilteredEntrySummary[]>,
  );

  const summaryByContractor = Object.entries(entriesByContractor).map(
    ([contractorId, contractorEntries]) => {
      const contractorBudgetByCurrency = contractorEntries.reduce(
        (acc, entry) => {
          if (!acc[entry.budget.currency]) acc[entry.budget.currency] = 0;
          acc[entry.budget.currency] += entry.budget.amount;
          return acc;
        },
        {} as Record<string, number>,
      );

      const contractorBudget: CurrencyValue[] = Object.entries(
        contractorBudgetByCurrency,
      ).map(([currency, amount]) => ({ amount, currency }));

      const contractorHours = contractorEntries.reduce(
        (total, entry) => total + entry.duration,
        0,
      );

      return {
        contractorId: Number(contractorId),
        entriesCount: contractorEntries.length,
        hours: contractorHours,
        budget: contractorBudget,
      };
    },
  );

  // Summary by task
  const entriesByTask = entries.reduce(
    (acc, entry) => {
      if (!acc[entry.taskId]) acc[entry.taskId] = [];
      acc[entry.taskId].push(entry);
      return acc;
    },
    {} as Record<string, FilteredEntrySummary[]>,
  );

  const summaryByTask = Object.entries(entriesByTask).map(
    ([taskId, taskEntries]) => {
      const taskType = report.data.definitions.taskTypes[taskId];
      const taskBudgetByCurrency = taskEntries.reduce(
        (acc, entry) => {
          if (!acc[entry.budget.currency]) acc[entry.budget.currency] = 0;
          acc[entry.budget.currency] += entry.budget.amount;
          return acc;
        },
        {} as Record<string, number>,
      );

      const taskBudget: CurrencyValue[] = Object.entries(
        taskBudgetByCurrency,
      ).map(([currency, amount]) => ({ amount, currency }));

      const taskHours = taskEntries.reduce(
        (total, entry) => total + entry.duration,
        0,
      );

      return {
        taskId,
        taskName: taskType?.name || "Unknown Task",
        entriesCount: taskEntries.length,
        hours: taskHours,
        budget: taskBudget,
      };
    },
  );

  // Summary by activity
  const entriesByActivity = entries.reduce(
    (acc, entry) => {
      if (!acc[entry.activityId]) acc[entry.activityId] = [];
      acc[entry.activityId].push(entry);
      return acc;
    },
    {} as Record<string, FilteredEntrySummary[]>,
  );

  const summaryByActivity = Object.entries(entriesByActivity).map(
    ([activityId, activityEntries]) => {
      const activityType = report.data.definitions.activityTypes[activityId];
      const activityBudgetByCurrency = activityEntries.reduce(
        (acc, entry) => {
          if (!acc[entry.budget.currency]) acc[entry.budget.currency] = 0;
          acc[entry.budget.currency] += entry.budget.amount;
          return acc;
        },
        {} as Record<string, number>,
      );

      const activityBudget: CurrencyValue[] = Object.entries(
        activityBudgetByCurrency,
      ).map(([currency, amount]) => ({ amount, currency }));

      const activityHours = activityEntries.reduce(
        (total, entry) => total + entry.duration,
        0,
      );

      return {
        activityId,
        activityName: activityType?.name || "Unknown Activity",
        entriesCount: activityEntries.length,
        hours: activityHours,
        budget: activityBudget,
      };
    },
  );

  return {
    entries,
    totalEntries: entries.length,
    totalHours,
    totalBudget,
    summaryByRole,
    summaryByContractor,
    summaryByTask,
    summaryByActivity,
  };
}

function getGroupedView(
  report: GeneratedReportSource,
  filters: EntryFilters,
  groupBy: GroupSpecifier,
  contractorNameLookup?: (contractorId: number) => string | undefined,
): GroupedView {
  // Apply filters first
  let filteredEntries = report.data.timeEntries;

  if (filters.roleIds && filters.roleIds.length > 0) {
    filteredEntries = filteredEntries.filter((entry) =>
      filters.roleIds!.includes(entry.roleId),
    );
  }

  if (filters.contractorIds && filters.contractorIds.length > 0) {
    filteredEntries = filteredEntries.filter((entry) =>
      filters.contractorIds!.includes(entry.contractorId),
    );
  }

  if (filters.taskIds && filters.taskIds.length > 0) {
    filteredEntries = filteredEntries.filter((entry) =>
      filters.taskIds!.includes(entry.taskId),
    );
  }

  if (filters.activityIds && filters.activityIds.length > 0) {
    filteredEntries = filteredEntries.filter((entry) =>
      filters.activityIds!.includes(entry.activityId),
    );
  }

  if (filters.projectIds && filters.projectIds.length > 0) {
    filteredEntries = filteredEntries.filter((entry) =>
      filters.projectIds!.includes(entry.projectId),
    );
  }

  // Group entries by the single group specifier
  const groups = groupEntriesBySpecifier(
    filteredEntries,
    report,
    groupBy,
    contractorNameLookup,
  );

  // Calculate totals
  const totalHours = filteredEntries.reduce((total, entry) => {
    return (
      total +
      (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60)
    );
  }, 0);

  const totalCostBudgetByCurrency = filteredEntries.reduce(
    (acc, entry) => {
      const roleType = report.data.definitions.roleTypes[entry.roleId];
      if (!roleType || roleType.rates.length === 0) return acc;

      const matchingRate = getMatchingRate(report.data, entry);

      const hours =
        (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);
      const cost = hours * matchingRate.costRate;
      const currency = matchingRate.costCurrency;

      if (!acc[currency]) acc[currency] = 0;
      acc[currency] += cost;
      return acc;
    },
    {} as Record<string, number>,
  );

  const totalBillingBudgetByCurrency = filteredEntries.reduce(
    (acc, entry) => {
      const roleType = report.data.definitions.roleTypes[entry.roleId];
      if (!roleType || roleType.rates.length === 0) return acc;

      const matchingRate = getMatchingRate(report.data, entry);

      const hours =
        (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);
      const billing = hours * matchingRate.billingRate;
      const currency = matchingRate.billingCurrency;

      if (!acc[currency]) acc[currency] = 0;
      acc[currency] += billing;
      return acc;
    },
    {} as Record<string, number>,
  );

  const totalCostBudget: CurrencyValue[] = Object.entries(
    totalCostBudgetByCurrency,
  ).map(([currency, amount]) => ({ amount, currency }));

  const totalBillingBudget: CurrencyValue[] = Object.entries(
    totalBillingBudgetByCurrency,
  ).map(([currency, amount]) => ({ amount, currency }));

  // Calculate earnings (billing - cost)
  const totalEarningsBudgetByCurrency: Record<string, number> = {};
  const allCurrencies = new Set([
    ...Object.keys(totalCostBudgetByCurrency),
    ...Object.keys(totalBillingBudgetByCurrency),
  ]);

  for (const currency of allCurrencies) {
    const costAmount = totalCostBudgetByCurrency[currency] || 0;
    const billingAmount = totalBillingBudgetByCurrency[currency] || 0;
    totalEarningsBudgetByCurrency[currency] = billingAmount - costAmount;
  }

  const totalEarningsBudget: CurrencyValue[] = Object.entries(
    totalEarningsBudgetByCurrency,
  ).map(([currency, amount]) => ({ amount, currency }));

  return {
    groups,
    totalEntries: filteredEntries.length,
    totalHours,
    totalCostBudget,
    totalBillingBudget,
    totalEarningsBudget,
  };
}

function groupEntriesBySpecifier(
  entries: GeneratedReportSource["data"]["timeEntries"],
  report: GeneratedReportSource,
  groupBy: GroupSpecifier,
  contractorNameLookup?: (contractorId: number) => string | undefined,
): GroupedEntrySummary[] {
  const specifier = groupBy;

  // Group entries by the current specifier
  const groupedEntries = entries.reduce(
    (acc, entry) => {
      let groupKey: string;

      switch (specifier.type) {
        case "contractor":
          groupKey = entry.contractorId.toString();
          break;
        case "role":
          groupKey = entry.roleId;
          break;
        case "task":
          groupKey = entry.taskId;
          break;
        case "activity":
          groupKey = entry.activityId;
          break;
        case "project":
          groupKey = entry.projectId;
          break;
        default:
          groupKey = "unknown";
      }

      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(entry);
      return acc;
    },
    {} as Record<string, typeof entries>,
  );

  // Create GroupedEntrySummary for each group
  const groups: GroupedEntrySummary[] = Object.entries(groupedEntries).map(
    ([groupKey, groupEntries]) => {
      // Get group name and description
      let groupName: string;
      let groupDescription: string | undefined;

      switch (specifier.type) {
        case "contractor": {
          const contractorId = Number(groupKey);
          groupName =
            contractorNameLookup?.(contractorId) ||
            `Contractor #${contractorId}`;
          groupDescription = undefined;
          break;
        }
        case "role": {
          const roleType = report.data.definitions.roleTypes[groupKey];
          groupName = roleType?.name || "Unknown Role";
          groupDescription = roleType?.description;
          break;
        }
        case "task": {
          const taskType = report.data.definitions.taskTypes[groupKey];
          groupName = taskType?.name || "Unknown Task";
          groupDescription = taskType?.description;
          break;
        }
        case "activity": {
          const activityType = report.data.definitions.activityTypes[groupKey];
          groupName = activityType?.name || "Unknown Activity";
          groupDescription = activityType?.description;
          break;
        }
        case "project": {
          const projectType = report.data.definitions.projectTypes[groupKey];
          groupName = projectType?.name || "Unknown Project";
          groupDescription = projectType?.description;
          break;
        }
        default:
          groupName = "Unknown";
      }

      // Calculate budgets for this group
      const costBudgetByCurrency = groupEntries.reduce(
        (acc, entry) => {
          const roleType = report.data.definitions.roleTypes[entry.roleId];
          if (!roleType || roleType.rates.length === 0) return acc;

          const matchingRate = getMatchingRate(report.data, entry);

          const hours =
            (entry.endAt.getTime() - entry.startAt.getTime()) /
            (1000 * 60 * 60);
          const cost = hours * matchingRate.costRate;
          const currency = matchingRate.costCurrency;

          if (!acc[currency]) acc[currency] = 0;
          acc[currency] += cost;
          return acc;
        },
        {} as Record<string, number>,
      );

      const billingBudgetByCurrency = groupEntries.reduce(
        (acc, entry) => {
          const roleType = report.data.definitions.roleTypes[entry.roleId];
          if (!roleType || roleType.rates.length === 0) return acc;

          const matchingRate = getMatchingRate(report.data, entry);
          const hours =
            (entry.endAt.getTime() - entry.startAt.getTime()) /
            (1000 * 60 * 60);
          const billing = hours * matchingRate.billingRate;
          const currency = matchingRate.billingCurrency;

          if (!acc[currency]) acc[currency] = 0;
          acc[currency] += billing;
          return acc;
        },
        {} as Record<string, number>,
      );

      const costBudget: CurrencyValue[] = Object.entries(
        costBudgetByCurrency,
      ).map(([currency, amount]) => ({ amount, currency }));

      const billingBudget: CurrencyValue[] = Object.entries(
        billingBudgetByCurrency,
      ).map(([currency, amount]) => ({ amount, currency }));

      // Calculate earnings (billing - cost)
      const earningsBudgetByCurrency: Record<string, number> = {};
      const allCurrencies = new Set([
        ...Object.keys(costBudgetByCurrency),
        ...Object.keys(billingBudgetByCurrency),
      ]);

      for (const currency of allCurrencies) {
        const costAmount = costBudgetByCurrency[currency] || 0;
        const billingAmount = billingBudgetByCurrency[currency] || 0;
        earningsBudgetByCurrency[currency] = billingAmount - costAmount;
      }

      const earningsBudget: CurrencyValue[] = Object.entries(
        earningsBudgetByCurrency,
      ).map(([currency, amount]) => ({ amount, currency }));

      const totalHours = groupEntries.reduce((total, entry) => {
        return (
          total +
          (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60)
        );
      }, 0);

      return {
        groupKey,
        groupName,
        groupDescription,
        entriesCount: groupEntries.length,
        totalHours,
        costBudget,
        billingBudget,
        earningsBudget,
      };
    },
  );

  return groups;
}
