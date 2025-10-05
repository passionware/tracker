import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { CurrencyValue } from "@/services/ExchangeService/ExchangeService.ts";

export interface GeneratedReportViewService {
  getBasicInformationView: (
    report: GeneratedReportSource,
  ) => BasicInformationView;
  getRolesSummaryView: (report: GeneratedReportSource) => RolesSummaryView;
  getContractorsSummaryView: (
    report: GeneratedReportSource,
  ) => ContractorsSummaryView;
  getTaskTypesSummaryView: (
    report: GeneratedReportSource,
  ) => TaskTypesSummaryView;
  getActivityTypesSummaryView: (
    report: GeneratedReportSource,
  ) => ActivityTypesSummaryView;
  getFilteredEntriesView: (
    report: GeneratedReportSource,
    filters: EntryFilters,
  ) => FilteredEntriesView;
}

export interface WithGeneratedReportViewService {
  generatedReportViewService: GeneratedReportViewService;
}

export interface EntryFilters {
  roleIds?: string[];
  contractorIds?: number[];
  taskIds?: string[];
  activityIds?: string[];
}

export interface BasicInformationView {
  reportId: number;
  createdAt: Date;
  projectIterationId: number;
  statistics: {
    timeEntriesCount: number;
    taskTypesCount: number;
    activityTypesCount: number;
    roleTypesCount: number;
    totalBudget: CurrencyValue[];
  };
}

export interface RoleSummary {
  roleId: string;
  name: string;
  description: string;
  entriesCount: number;
  totalHours: number;
  budget: CurrencyValue[];
  rates: {
    activityType: string;
    taskType: string;
    rate: number;
    currency: string;
  }[];
}

export interface RolesSummaryView {
  roles: RoleSummary[];
}

export interface ContractorSummary {
  contractorId: number;
  entriesCount: number;
  totalHours: number;
  budget: CurrencyValue[];
  budgetByRole: {
    roleId: string;
    roleName: string;
    hours: number;
    budget: CurrencyValue[];
  }[];
}

export interface ContractorsSummaryView {
  contractors: ContractorSummary[];
}

export interface TaskTypeSummary {
  taskId: string;
  name: string;
  description: string;
  entriesCount: number;
  totalHours: number;
  budget: CurrencyValue[];
  budgetByRole: {
    roleId: string;
    roleName: string;
    hours: number;
    budget: CurrencyValue[];
  }[];
}

export interface TaskTypesSummaryView {
  taskTypes: TaskTypeSummary[];
}

export interface ActivityTypeSummary {
  activityId: string;
  name: string;
  description: string;
  entriesCount: number;
  totalHours: number;
  budget: CurrencyValue[];
  budgetByRole: {
    roleId: string;
    roleName: string;
    hours: number;
    budget: CurrencyValue[];
  }[];
}

export interface ActivityTypesSummaryView {
  activityTypes: ActivityTypeSummary[];
}

export interface FilteredEntrySummary {
  entryId: string;
  contractorId: number;
  roleId: string;
  taskId: string;
  activityId: string;
  startAt: Date;
  endAt: Date;
  duration: number; // in hours
  budget: CurrencyValue;
  description?: string;
}

export interface FilteredEntriesView {
  entries: FilteredEntrySummary[];
  totalEntries: number;
  totalHours: number;
  totalBudget: CurrencyValue[];
  summaryByRole: {
    roleId: string;
    roleName: string;
    entriesCount: number;
    hours: number;
    budget: CurrencyValue[];
  }[];
  summaryByContractor: {
    contractorId: number;
    entriesCount: number;
    hours: number;
    budget: CurrencyValue[];
  }[];
  summaryByTask: {
    taskId: string;
    taskName: string;
    entriesCount: number;
    hours: number;
    budget: CurrencyValue[];
  }[];
  summaryByActivity: {
    activityId: string;
    activityName: string;
    entriesCount: number;
    hours: number;
    budget: CurrencyValue[];
  }[];
}
