import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { CurrencyValue } from "@/services/ExchangeService/ExchangeService.ts";

export interface GeneratedReportViewService {
  getBasicInformationView: (
    report: GeneratedReportSource,
  ) => BasicInformationView;
  getProjectsSummaryView: (
    report: GeneratedReportSource,
  ) => ProjectsSummaryView;
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
  getGroupedView: (
    report: GeneratedReportSource,
    filters: EntryFilters,
    groupBy: GroupSpecifier[],
  ) => GroupedView;
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

export type GroupSpecifier =
  | { type: "contractor" }
  | { type: "role" }
  | { type: "task" }
  | { type: "activity" };

export interface GroupedEntrySummary {
  groupKey: string;
  groupName: string;
  groupDescription?: string;
  entriesCount: number;
  totalHours: number;
  costBudget: CurrencyValue[];
  billingBudget: CurrencyValue[];
  earningsBudget: CurrencyValue[];
  subGroups?: GroupedEntrySummary[];
}

export interface GroupedView {
  groups: GroupedEntrySummary[];
  totalEntries: number;
  totalHours: number;
  totalCostBudget: CurrencyValue[];
  totalBillingBudget: CurrencyValue[];
  totalEarningsBudget: CurrencyValue[];
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
    totalCostBudget: CurrencyValue[]; // What we pay contractors
    totalBillingBudget: CurrencyValue[]; // What we charge clients
    totalEarningsBudget: CurrencyValue[]; // Billing - Cost (profit/margin)
  };
}

export interface ProjectSummary {
  projectId: string;
  name: string;
  description: string;
  entriesCount: number;
  totalHours: number;
  costBudget: CurrencyValue[]; // What we pay contractors
  billingBudget: CurrencyValue[]; // What we charge clients
  earningsBudget: CurrencyValue[]; // Billing - Cost (profit/margin)
  budgetCap?: {
    amount: number;
    currency: string;
  };
  budgetByRole: {
    roleId: string;
    roleName: string;
    hours: number;
    costBudget: CurrencyValue[];
    billingBudget: CurrencyValue[];
    earningsBudget: CurrencyValue[];
  }[];
}

export interface RoleSummary {
  roleId: string;
  name: string;
  description: string;
  entriesCount: number;
  totalHours: number;
  costBudget: CurrencyValue[]; // What we pay contractors
  billingBudget: CurrencyValue[]; // What we charge clients
  earningsBudget: CurrencyValue[]; // Billing - Cost (profit/margin)
  rates: {
    activityType: string;
    taskType: string;
    projectId?: string;
    costRate: number;
    costCurrency: string;
    billingRate: number;
    billingCurrency: string;
  }[];
}

export interface ProjectsSummaryView {
  projects: ProjectSummary[];
}

export interface RolesSummaryView {
  roles: RoleSummary[];
}

export interface ContractorSummary {
  contractorId: number;
  entriesCount: number;
  totalHours: number;
  costBudget: CurrencyValue[]; // What we pay contractors
  billingBudget: CurrencyValue[]; // What we charge clients
  earningsBudget: CurrencyValue[]; // Billing - Cost (profit/margin)
  budgetByRole: {
    roleId: string;
    roleName: string;
    hours: number;
    costBudget: CurrencyValue[];
    billingBudget: CurrencyValue[];
    earningsBudget: CurrencyValue[];
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
  costBudget: CurrencyValue[]; // What we pay contractors
  billingBudget: CurrencyValue[]; // What we charge clients
  earningsBudget: CurrencyValue[]; // Billing - Cost (profit/margin)
  budgetByRole: {
    roleId: string;
    roleName: string;
    hours: number;
    costBudget: CurrencyValue[];
    billingBudget: CurrencyValue[];
    earningsBudget: CurrencyValue[];
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
  costBudget: CurrencyValue[]; // What we pay contractors
  billingBudget: CurrencyValue[]; // What we charge clients
  earningsBudget: CurrencyValue[]; // Billing - Cost (profit/margin)
  budgetByRole: {
    roleId: string;
    roleName: string;
    hours: number;
    costBudget: CurrencyValue[];
    billingBudget: CurrencyValue[];
    earningsBudget: CurrencyValue[];
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
  projectId: string;
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
