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

  // Calculate overall earnings percentage (total billing / total cost - 1) * 100
  const totalCostAmount = Object.values(costBudgetByCurrency).reduce(
    (sum, amount) => sum + amount,
    0,
  );
  const totalBillingAmount = Object.values(billingBudgetByCurrency).reduce(
    (sum, amount) => sum + amount,
    0,
  );
  const totalEarningsPercentage =
    totalCostAmount > 0
      ? ((totalBillingAmount - totalCostAmount) / totalCostAmount) * 100
      : 0;

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
      totalEarningsPercentage,
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
          earningsPercentage: 0,
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

      // Calculate overall earnings percentage (total billing / total cost - 1) * 100
      const totalCostAmount = Object.values(costBudgetByCurrency).reduce(
        (sum, amount) => sum + amount,
        0,
      );
      const totalBillingAmount = Object.values(billingBudgetByCurrency).reduce(
        (sum, amount) => sum + amount,
        0,
      );
      const earningsPercentage =
        totalCostAmount > 0
          ? ((totalBillingAmount - totalCostAmount) / totalCostAmount) * 100
          : 0;

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
        earningsPercentage,
        rates: roleType.rates,
      };
    },
  );

  return { roles };
}

function getContractorsSummaryView(
  report: GeneratedReportSource,
): ContractorsSummaryView {
  const entriesByContractor = report.data.timeEntries.reduce(
    (acc, entry) => {
      const contractorId = entry.contractorId;
      if (!acc[contractorId]) acc[contractorId] = [];
      acc[contractorId].push(entry);
      return acc;
    },
    {} as Record<number, typeof report.data.timeEntries>,
  );

  const contractors = Object.entries(entriesByContractor).map(
    ([contractorId, entries]) => {
      const costBudgetByCurrency = entries.reduce(
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

      const billingBudgetByCurrency = entries.reduce(
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

      // Calculate overall earnings percentage
      const totalCostAmount = Object.values(costBudgetByCurrency).reduce(
        (sum, amount) => sum + amount,
        0,
      );
      const totalBillingAmount = Object.values(billingBudgetByCurrency).reduce(
        (sum, amount) => sum + amount,
        0,
      );
      const earningsPercentage =
        totalCostAmount > 0
          ? ((totalBillingAmount - totalCostAmount) / totalCostAmount) * 100
          : 0;

      const totalHours = entries.reduce((total, entry) => {
        return (
          total +
          (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60)
        );
      }, 0);

      // Group by role
      const entriesByRole = entries.reduce(
        (acc, entry) => {
          if (!acc[entry.roleId]) acc[entry.roleId] = [];
          acc[entry.roleId].push(entry);
          return acc;
        },
        {} as Record<string, typeof entries>,
      );

      const budgetByRole = Object.entries(entriesByRole).map(
        ([roleId, roleEntries]) => {
          const roleType = report.data.definitions.roleTypes[roleId];
          const roleCostBudgetByCurrency = roleEntries.reduce(
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

          const roleBillingBudgetByCurrency = roleEntries.reduce(
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

          const roleCostBudget: CurrencyValue[] = Object.entries(
            roleCostBudgetByCurrency,
          ).map(([currency, amount]) => ({ amount, currency }));

          const roleBillingBudget: CurrencyValue[] = Object.entries(
            roleBillingBudgetByCurrency,
          ).map(([currency, amount]) => ({ amount, currency }));

          // Calculate earnings for this role
          const roleEarningsBudgetByCurrency: Record<string, number> = {};
          const roleAllCurrencies = new Set([
            ...Object.keys(roleCostBudgetByCurrency),
            ...Object.keys(roleBillingBudgetByCurrency),
          ]);

          for (const currency of roleAllCurrencies) {
            const costAmount = roleCostBudgetByCurrency[currency] || 0;
            const billingAmount = roleBillingBudgetByCurrency[currency] || 0;
            roleEarningsBudgetByCurrency[currency] = billingAmount - costAmount;
          }

          const roleEarningsBudget: CurrencyValue[] = Object.entries(
            roleEarningsBudgetByCurrency,
          ).map(([currency, amount]) => ({ amount, currency }));

          // Calculate earnings percentage for this role
          const roleTotalCostAmount = Object.values(
            roleCostBudgetByCurrency,
          ).reduce((sum, amount) => sum + amount, 0);
          const roleTotalBillingAmount = Object.values(
            roleBillingBudgetByCurrency,
          ).reduce((sum, amount) => sum + amount, 0);
          const roleEarningsPercentage =
            roleTotalCostAmount > 0
              ? ((roleTotalBillingAmount - roleTotalCostAmount) /
                  roleTotalCostAmount) *
                100
              : 0;

          const roleHours = roleEntries.reduce((total, entry) => {
            return (
              total +
              (entry.endAt.getTime() - entry.startAt.getTime()) /
                (1000 * 60 * 60)
            );
          }, 0);

          return {
            roleId,
            roleName: roleType.name,
            hours: roleHours,
            costBudget: roleCostBudget,
            billingBudget: roleBillingBudget,
            earningsBudget: roleEarningsBudget,
            earningsPercentage: roleEarningsPercentage,
          };
        },
      );

      return {
        contractorId: Number(contractorId),
        entriesCount: entries.length,
        totalHours,
        costBudget,
        billingBudget,
        earningsBudget,
        earningsPercentage,
        budgetByRole,
      };
    },
  );

  return { contractors };
}

function getTaskTypesSummaryView(
  report: GeneratedReportSource,
): TaskTypesSummaryView {
  const taskTypes = Object.entries(report.data.definitions.taskTypes).map(
    ([taskId, taskType]) => {
      const taskEntries = report.data.timeEntries.filter(
        (entry) => entry.taskId === taskId,
      );

      if (taskEntries.length === 0) {
        return {
          taskId,
          name: taskType.name,
          description: taskType.description,
          entriesCount: 0,
          totalHours: 0,
          costBudget: [],
          billingBudget: [],
          earningsBudget: [],
          earningsPercentage: 0,
          budgetByRole: [],
        };
      }

      const costBudgetByCurrency = taskEntries.reduce(
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

      const billingBudgetByCurrency = taskEntries.reduce(
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

      // Calculate overall earnings percentage
      const totalCostAmount = Object.values(costBudgetByCurrency).reduce(
        (sum, amount) => sum + amount,
        0,
      );
      const totalBillingAmount = Object.values(billingBudgetByCurrency).reduce(
        (sum, amount) => sum + amount,
        0,
      );
      const earningsPercentage =
        totalCostAmount > 0
          ? ((totalBillingAmount - totalCostAmount) / totalCostAmount) * 100
          : 0;

      const totalHours = taskEntries.reduce((total, entry) => {
        return (
          total +
          (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60)
        );
      }, 0);

      // Group by role
      const entriesByRole = taskEntries.reduce(
        (acc, entry) => {
          if (!acc[entry.roleId]) acc[entry.roleId] = [];
          acc[entry.roleId].push(entry);
          return acc;
        },
        {} as Record<string, typeof taskEntries>,
      );

      const budgetByRole = Object.entries(entriesByRole).map(
        ([roleId, roleEntries]) => {
          const roleType = report.data.definitions.roleTypes[roleId];
          const roleCostBudgetByCurrency = roleEntries.reduce(
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

          const roleBillingBudgetByCurrency = roleEntries.reduce(
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

          const roleCostBudget: CurrencyValue[] = Object.entries(
            roleCostBudgetByCurrency,
          ).map(([currency, amount]) => ({ amount, currency }));

          const roleBillingBudget: CurrencyValue[] = Object.entries(
            roleBillingBudgetByCurrency,
          ).map(([currency, amount]) => ({ amount, currency }));

          // Calculate earnings for this role
          const roleEarningsBudgetByCurrency: Record<string, number> = {};
          const roleAllCurrencies = new Set([
            ...Object.keys(roleCostBudgetByCurrency),
            ...Object.keys(roleBillingBudgetByCurrency),
          ]);

          for (const currency of roleAllCurrencies) {
            const costAmount = roleCostBudgetByCurrency[currency] || 0;
            const billingAmount = roleBillingBudgetByCurrency[currency] || 0;
            roleEarningsBudgetByCurrency[currency] = billingAmount - costAmount;
          }

          const roleEarningsBudget: CurrencyValue[] = Object.entries(
            roleEarningsBudgetByCurrency,
          ).map(([currency, amount]) => ({ amount, currency }));

          // Calculate earnings percentage for this role
          const roleTotalCostAmount = Object.values(
            roleCostBudgetByCurrency,
          ).reduce((sum, amount) => sum + amount, 0);
          const roleTotalBillingAmount = Object.values(
            roleBillingBudgetByCurrency,
          ).reduce((sum, amount) => sum + amount, 0);
          const roleEarningsPercentage =
            roleTotalCostAmount > 0
              ? ((roleTotalBillingAmount - roleTotalCostAmount) /
                  roleTotalCostAmount) *
                100
              : 0;

          const roleHours = roleEntries.reduce((total, entry) => {
            return (
              total +
              (entry.endAt.getTime() - entry.startAt.getTime()) /
                (1000 * 60 * 60)
            );
          }, 0);

          return {
            roleId,
            roleName: roleType.name,
            hours: roleHours,
            costBudget: roleCostBudget,
            billingBudget: roleBillingBudget,
            earningsBudget: roleEarningsBudget,
            earningsPercentage: roleEarningsPercentage,
          };
        },
      );

      return {
        taskId,
        name: taskType.name,
        description: taskType.description,
        entriesCount: taskEntries.length,
        totalHours,
        costBudget,
        billingBudget,
        earningsBudget,
        earningsPercentage,
        budgetByRole,
      };
    },
  );

  return { taskTypes };
}

function getActivityTypesSummaryView(
  report: GeneratedReportSource,
): ActivityTypesSummaryView {
  const activityTypes = Object.entries(
    report.data.definitions.activityTypes,
  ).map(([activityId, activityType]) => {
    const activityEntries = report.data.timeEntries.filter(
      (entry) => entry.activityId === activityId,
    );

    if (activityEntries.length === 0) {
      return {
        activityId,
        name: activityType.name,
        description: activityType.description,
        entriesCount: 0,
        totalHours: 0,
        costBudget: [],
        billingBudget: [],
        earningsBudget: [],
        earningsPercentage: 0,
        budgetByRole: [],
      };
    }

    const costBudgetByCurrency = activityEntries.reduce(
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

    const billingBudgetByCurrency = activityEntries.reduce(
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

    // Calculate overall earnings percentage
    const totalCostAmount = Object.values(costBudgetByCurrency).reduce(
      (sum, amount) => sum + amount,
      0,
    );
    const totalBillingAmount = Object.values(billingBudgetByCurrency).reduce(
      (sum, amount) => sum + amount,
      0,
    );
    const earningsPercentage =
      totalCostAmount > 0
        ? ((totalBillingAmount - totalCostAmount) / totalCostAmount) * 100
        : 0;

    const totalHours = activityEntries.reduce((total, entry) => {
      return (
        total +
        (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60)
      );
    }, 0);

    // Group by role
    const entriesByRole = activityEntries.reduce(
      (acc, entry) => {
        if (!acc[entry.roleId]) acc[entry.roleId] = [];
        acc[entry.roleId].push(entry);
        return acc;
      },
      {} as Record<string, typeof activityEntries>,
    );

    const budgetByRole = Object.entries(entriesByRole).map(
      ([roleId, roleEntries]) => {
        const roleType = report.data.definitions.roleTypes[roleId];
        const roleCostBudgetByCurrency = roleEntries.reduce(
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

        const roleBillingBudgetByCurrency = roleEntries.reduce(
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

        const roleCostBudget: CurrencyValue[] = Object.entries(
          roleCostBudgetByCurrency,
        ).map(([currency, amount]) => ({ amount, currency }));

        const roleBillingBudget: CurrencyValue[] = Object.entries(
          roleBillingBudgetByCurrency,
        ).map(([currency, amount]) => ({ amount, currency }));

        // Calculate earnings for this role
        const roleEarningsBudgetByCurrency: Record<string, number> = {};
        const roleAllCurrencies = new Set([
          ...Object.keys(roleCostBudgetByCurrency),
          ...Object.keys(roleBillingBudgetByCurrency),
        ]);

        for (const currency of roleAllCurrencies) {
          const costAmount = roleCostBudgetByCurrency[currency] || 0;
          const billingAmount = roleBillingBudgetByCurrency[currency] || 0;
          roleEarningsBudgetByCurrency[currency] = billingAmount - costAmount;
        }

        const roleEarningsBudget: CurrencyValue[] = Object.entries(
          roleEarningsBudgetByCurrency,
        ).map(([currency, amount]) => ({ amount, currency }));

        // Calculate earnings percentage for this role
        const roleTotalCostAmount = Object.values(
          roleCostBudgetByCurrency,
        ).reduce((sum, amount) => sum + amount, 0);
        const roleTotalBillingAmount = Object.values(
          roleBillingBudgetByCurrency,
        ).reduce((sum, amount) => sum + amount, 0);
        const roleEarningsPercentage =
          roleTotalCostAmount > 0
            ? ((roleTotalBillingAmount - roleTotalCostAmount) /
                roleTotalCostAmount) *
              100
            : 0;

        const roleHours = roleEntries.reduce((total, entry) => {
          return (
            total +
            (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60)
          );
        }, 0);

        return {
          roleId,
          roleName: roleType.name,
          hours: roleHours,
          costBudget: roleCostBudget,
          billingBudget: roleBillingBudget,
          earningsBudget: roleEarningsBudget,
          earningsPercentage: roleEarningsPercentage,
        };
      },
    );

    return {
      activityId,
      name: activityType.name,
      description: activityType.description,
      entriesCount: activityEntries.length,
      totalHours,
      costBudget,
      billingBudget,
      earningsBudget,
      earningsPercentage,
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
