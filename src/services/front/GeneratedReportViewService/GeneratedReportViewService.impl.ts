import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import {
  CurrencyValue,
  WithExchangeService,
} from "@/services/ExchangeService/ExchangeService.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
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

export function createGeneratedReportViewService(
  services: WithFormatService & WithExchangeService,
): GeneratedReportViewService {
  return {
    getBasicInformationView: (report) =>
      getBasicInformationView(report, services),
    getRolesSummaryView: (report) => getRolesSummaryView(report, services),
    getContractorsSummaryView: (report) =>
      getContractorsSummaryView(report, services),
    getTaskTypesSummaryView: (report) =>
      getTaskTypesSummaryView(report, services),
    getActivityTypesSummaryView: (report) =>
      getActivityTypesSummaryView(report, services),
    getFilteredEntriesView: (report, filters) =>
      getFilteredEntriesView(report, filters, services),
  };
}

function getBasicInformationView(
  report: GeneratedReportSource,
  services: WithFormatService & WithExchangeService,
): BasicInformationView {
  const budgetByCurrency = report.data.timeEntries.reduce(
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
      const cost = hours * matchingRate.rate;
      const currency = matchingRate.currency;

      if (!acc[currency]) acc[currency] = 0;
      acc[currency] += cost;
      return acc;
    },
    {} as Record<string, number>,
  );

  const totalBudget: CurrencyValue[] = Object.entries(budgetByCurrency).map(
    ([currency, amount]) => ({ amount, currency }),
  );

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
      totalBudget,
    },
  };
}

function getRolesSummaryView(
  report: GeneratedReportSource,
  services: WithFormatService & WithExchangeService,
): RolesSummaryView {
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
          budget: [],
          rates: roleType.rates,
        };
      }

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

      const budget: CurrencyValue[] = Object.entries(budgetByCurrency).map(
        ([currency, amount]) => ({ amount, currency }),
      );

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
        budget,
        rates: roleType.rates,
      };
    },
  );

  return { roles };
}

function getContractorsSummaryView(
  report: GeneratedReportSource,
  services: WithFormatService & WithExchangeService,
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
      const budgetByCurrency = entries.reduce(
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
          const cost = hours * matchingRate.rate;
          const currency = matchingRate.currency;

          if (!acc[currency]) acc[currency] = 0;
          acc[currency] += cost;
          return acc;
        },
        {} as Record<string, number>,
      );

      const budget: CurrencyValue[] = Object.entries(budgetByCurrency).map(
        ([currency, amount]) => ({ amount, currency }),
      );

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
          const roleBudgetByCurrency = roleEntries.reduce(
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

          const roleBudget: CurrencyValue[] = Object.entries(
            roleBudgetByCurrency,
          ).map(([currency, amount]) => ({ amount, currency }));

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
            budget: roleBudget,
          };
        },
      );

      return {
        contractorId: Number(contractorId),
        entriesCount: entries.length,
        totalHours,
        budget,
        budgetByRole,
      };
    },
  );

  return { contractors };
}

function getTaskTypesSummaryView(
  report: GeneratedReportSource,
  services: WithFormatService & WithExchangeService,
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
          budget: [],
          budgetByRole: [],
        };
      }

      const budgetByCurrency = taskEntries.reduce(
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
          const cost = hours * matchingRate.rate;
          const currency = matchingRate.currency;

          if (!acc[currency]) acc[currency] = 0;
          acc[currency] += cost;
          return acc;
        },
        {} as Record<string, number>,
      );

      const budget: CurrencyValue[] = Object.entries(budgetByCurrency).map(
        ([currency, amount]) => ({ amount, currency }),
      );

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
          const roleBudgetByCurrency = roleEntries.reduce(
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

          const roleBudget: CurrencyValue[] = Object.entries(
            roleBudgetByCurrency,
          ).map(([currency, amount]) => ({ amount, currency }));

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
            budget: roleBudget,
          };
        },
      );

      return {
        taskId,
        name: taskType.name,
        description: taskType.description,
        entriesCount: taskEntries.length,
        totalHours,
        budget,
        budgetByRole,
      };
    },
  );

  return { taskTypes };
}

function getActivityTypesSummaryView(
  report: GeneratedReportSource,
  services: WithFormatService & WithExchangeService,
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
        budget: [],
        budgetByRole: [],
      };
    }

    const budgetByCurrency = activityEntries.reduce(
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
        const cost = hours * matchingRate.rate;
        const currency = matchingRate.currency;

        if (!acc[currency]) acc[currency] = 0;
        acc[currency] += cost;
        return acc;
      },
      {} as Record<string, number>,
    );

    const budget: CurrencyValue[] = Object.entries(budgetByCurrency).map(
      ([currency, amount]) => ({ amount, currency }),
    );

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
        const roleBudgetByCurrency = roleEntries.reduce(
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

        const roleBudget: CurrencyValue[] = Object.entries(
          roleBudgetByCurrency,
        ).map(([currency, amount]) => ({ amount, currency }));

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
          budget: roleBudget,
        };
      },
    );

    return {
      activityId,
      name: activityType.name,
      description: activityType.description,
      entriesCount: activityEntries.length,
      totalHours,
      budget,
      budgetByRole,
    };
  });

  return { activityTypes };
}

function getFilteredEntriesView(
  report: GeneratedReportSource,
  filters: EntryFilters,
  services: WithFormatService & WithExchangeService,
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
    const cost = matchingRate ? hours * matchingRate.rate : 0;
    const currency = matchingRate?.currency || "EUR";

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
