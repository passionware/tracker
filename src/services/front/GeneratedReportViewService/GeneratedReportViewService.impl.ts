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
  RolesSummaryView,
  TaskTypesSummaryView,
} from "./GeneratedReportViewService.ts";

export function createGeneratedReportViewService(): GeneratedReportViewService {
  return {
    getBasicInformationView: (report) => getBasicInformationView(report),
    getRolesSummaryView: (report) => getRolesSummaryView(report),
    getContractorsSummaryView: (report) => getContractorsSummaryView(report),
    getTaskTypesSummaryView: (report) => getTaskTypesSummaryView(report),
    getActivityTypesSummaryView: (report) =>
      getActivityTypesSummaryView(report),
    getFilteredEntriesView: (report, filters) =>
      getFilteredEntriesView(report, filters),
    getGroupedView: (report, filters, groupBy) =>
      getGroupedView(report, filters, groupBy),
  };
}

function getBasicInformationView(
  report: GeneratedReportSource,
): BasicInformationView {
  const costBudgetByCurrency = report.data.timeEntries.reduce(
    (acc, entry) => {
      const roleType = report.data.definitions.roleTypes[entry.roleId];
      if (!roleType || roleType.rates.length === 0) return acc;

      const matchingRate =
        roleType.rates.find(
          (rate) =>
            rate.activityType === entry.activityId &&
            rate.taskType === entry.taskId,
        ) || roleType.rates[0];

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

      const matchingRate =
        roleType.rates.find(
          (rate) =>
            rate.activityType === entry.activityId &&
            rate.taskType === entry.taskId,
        ) || roleType.rates[0];

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
  const roles = Object.entries(report.data.definitions.roleTypes).map(
    ([roleId, roleType]) => {
      const roleEntries = report.data.timeEntries.filter(
        (entry) => entry.roleId === roleId,
      );

      if (roleEntries.length === 0) {
        return {
          roleId,
          name: roleType.name,
          description: roleType.description,
          entriesCount: 0,
          totalHours: 0,
          costBudget: [],
          billingBudget: [],
          earningsBudget: [],
          // percentage removed from view layer; compute in UI when needed
          rates: roleType.rates,
        };
      }

      const costBudgetByCurrency = roleEntries.reduce(
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
                rate.taskType === entry.taskId,
            ) || roleType.rates[0];

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

      // Calculate earnings (billing - cost) - this is complex with multiple currencies
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

      const earningsBudget: CurrencyValue[] = Object.entries(
        earningsBudgetByCurrency,
      ).map(([currency, amount]) => ({ amount, currency }));

      const totalHours = roleEntries.reduce((total, entry) => {
        return (
          total +
          (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60)
        );
      }, 0);

      return {
        roleId,
        name: roleType.name,
        description: roleType.description,
        entriesCount: roleEntries.length,
        totalHours,
        costBudget,
        billingBudget,
        earningsBudget,
        // percentage removed from view layer; compute in UI when needed
        rates: roleType.rates,
      };
    },
  );

  return { roles };
}

function getContractorsSummaryView(
  report: GeneratedReportSource,
): ContractorsSummaryView {
  // Use the generic grouped view with contractor grouping and role sub-grouping
  const groupedView = getGroupedView(
    report,
    {}, // no filters
    [{ type: "contractor" }, { type: "role" }], // group by contractor, then by role
  );

  // Transform the generic grouped view to the specific contractors summary format
  const contractors = groupedView.groups.map((contractorGroup) => {
    const contractorId = Number(contractorGroup.groupKey);

    // Transform sub-groups (roles) to the expected format
    const budgetByRole =
      contractorGroup.subGroups?.map((roleGroup) => {
        return {
          roleId: roleGroup.groupKey,
          roleName: roleGroup.groupName,
          hours: roleGroup.totalHours,
          costBudget: roleGroup.costBudget,
          billingBudget: roleGroup.billingBudget,
          earningsBudget: roleGroup.earningsBudget,
        };
      }) || [];

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
  // Use the generic grouped view with task grouping and role sub-grouping
  const groupedView = getGroupedView(
    report,
    {}, // no filters
    [{ type: "task" }, { type: "role" }], // group by task, then by role
  );

  // Transform the generic grouped view to the specific task types summary format
  const taskTypes = groupedView.groups.map((taskGroup) => {
    // Transform sub-groups (roles) to the expected format
    const budgetByRole =
      taskGroup.subGroups?.map((roleGroup) => {
        return {
          roleId: roleGroup.groupKey,
          roleName: roleGroup.groupName,
          hours: roleGroup.totalHours,
          costBudget: roleGroup.costBudget,
          billingBudget: roleGroup.billingBudget,
          earningsBudget: roleGroup.earningsBudget,
        };
      }) || [];

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
  // Use the generic grouped view with activity grouping and role sub-grouping
  const groupedView = getGroupedView(
    report,
    {}, // no filters
    [{ type: "activity" }, { type: "role" }], // group by activity, then by role
  );

  // Transform the generic grouped view to the specific activity types summary format
  const activityTypes = groupedView.groups.map((activityGroup) => {
    // Transform sub-groups (roles) to the expected format
    const budgetByRole =
      activityGroup.subGroups?.map((roleGroup) => {
        // Calculate earnings percentage for this role
        const roleTotalCostAmount = roleGroup.costBudget.reduce(
          (sum, cv) => sum + cv.amount,
          0,
        );
        const roleTotalBillingAmount = roleGroup.billingBudget.reduce(
          (sum, cv) => sum + cv.amount,
          0,
        );
        const roleEarningsPercentage =
          roleTotalCostAmount > 0
            ? ((roleTotalBillingAmount - roleTotalCostAmount) /
                roleTotalCostAmount) *
              100
            : 0;

        return {
          roleId: roleGroup.groupKey,
          roleName: roleGroup.groupName,
          hours: roleGroup.totalHours,
          costBudget: roleGroup.costBudget,
          billingBudget: roleGroup.billingBudget,
          earningsBudget: roleGroup.earningsBudget,
          earningsPercentage: roleEarningsPercentage,
        };
      }) || [];

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

  const entries: FilteredEntrySummary[] = filteredEntries.map((entry) => {
    const roleType = report.data.definitions.roleTypes[entry.roleId];
    const matchingRate =
      roleType?.rates.find(
        (rate) =>
          rate.activityType === entry.activityId &&
          rate.taskType === entry.taskId,
      ) || roleType?.rates[0];

    const hours =
      (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);
    const cost = matchingRate ? hours * matchingRate.costRate : 0;
    const currency = matchingRate?.costCurrency || "EUR";

    return {
      entryId: `${entry.startAt.getTime()}-${entry.contractorId}`,
      contractorId: entry.contractorId,
      roleId: entry.roleId,
      taskId: entry.taskId,
      activityId: entry.activityId,
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
  groupBy: GroupSpecifier[],
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

  // Group entries by the first group specifier
  const groups = groupEntriesBySpecifier(filteredEntries, report, groupBy, 0);

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

      const matchingRate =
        roleType.rates.find(
          (rate) =>
            rate.activityType === entry.activityId &&
            rate.taskType === entry.taskId,
        ) || roleType.rates[0];

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

      const matchingRate =
        roleType.rates.find(
          (rate) =>
            rate.activityType === entry.activityId &&
            rate.taskType === entry.taskId,
        ) || roleType.rates[0];

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
  groupBy: GroupSpecifier[],
  specifierIndex: number,
): GroupedEntrySummary[] {
  if (specifierIndex >= groupBy.length) {
    return [];
  }

  const specifier = groupBy[specifierIndex];

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
        case "contractor":
          groupName = `Contractor ${groupKey}`;
          groupDescription = undefined;
          break;
        case "role":
          const roleType = report.data.definitions.roleTypes[groupKey];
          groupName = roleType?.name || "Unknown Role";
          groupDescription = roleType?.description;
          break;
        case "task":
          const taskType = report.data.definitions.taskTypes[groupKey];
          groupName = taskType?.name || "Unknown Task";
          groupDescription = taskType?.description;
          break;
        case "activity":
          const activityType = report.data.definitions.activityTypes[groupKey];
          groupName = activityType?.name || "Unknown Activity";
          groupDescription = activityType?.description;
          break;
        default:
          groupName = "Unknown";
      }

      // Calculate budgets for this group
      const costBudgetByCurrency = groupEntries.reduce(
        (acc, entry) => {
          const roleType = report.data.definitions.roleTypes[entry.roleId];
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

          const matchingRate =
            roleType.rates.find(
              (rate) =>
                rate.activityType === entry.activityId &&
                rate.taskType === entry.taskId,
            ) || roleType.rates[0];

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

      // Recursively create sub-groups if there are more specifiers
      const subGroups =
        specifierIndex < groupBy.length - 1
          ? groupEntriesBySpecifier(
              groupEntries,
              report,
              groupBy,
              specifierIndex + 1,
            )
          : undefined;

      return {
        groupKey,
        groupName,
        groupDescription,
        entriesCount: groupEntries.length,
        totalHours,
        costBudget,
        billingBudget,
        earningsBudget,
        subGroups,
      };
    },
  );

  return groups;
}
