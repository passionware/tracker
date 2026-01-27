import {
  BooleanFilter,
  booleanFilterSchema,
} from "@/api/_common/query/filters/BooleanFilter.ts";
import {
  DateFilter,
  dateFilterSchema,
} from "@/api/_common/query/filters/DateFilter.ts";
import {
  EnumFilter,
  enumFilterSchema,
} from "@/api/_common/query/filters/EnumFilter.ts";
import {
  NumberFilter,
  numberFilterSchema,
} from "@/api/_common/query/filters/NumberFilter.ts";
import { paginationSchema } from "@/api/_common/query/pagination.ts";
import {
  withBuilderUtils,
  WithFilters,
  withFiltersUtils,
  WithPagination,
  withPaginationUtils,
  WithSorter,
  withSorterUtils,
} from "@/api/_common/query/queryUtils.ts";
import { BillingBase } from "@/api/billing/billing.api.ts";
import { Client } from "@/api/clients/clients.api.ts";
import { Contractor, ContractorBase } from "@/api/contractor/contractor.api.ts";
import { CostBase } from "@/api/cost/cost.api.ts";
import { LinkBillingReport } from "@/api/link-billing-report/link-billing-report.api.ts";
import { LinkCostReport } from "@/api/link-cost-report/link-cost-report.ts";
import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import { ExpressionContext } from "@/services/front/ExpressionService/ExpressionService.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { CalendarDate } from "@internationalized/date";
import { maybe } from "@passionware/monads";
import { chain } from "lodash";
import { z } from "zod";

// Unit types for reports (simplified abbreviations)
export type ReportUnit = "h" | "d" | "pc" | string; // h=hours, d=days, pc=pieces

// Link validation helpers
export const LinkValidation = {
  // Check if billing link has detailed breakdown available
  hasDetailedBillingBreakdown: (link: {
    breakdown?: {
      quantity: number;
      unit: string;
      reportUnitPrice: number;
      billingUnitPrice: number;
    };
  }): boolean => {
    return !!(
      link.breakdown &&
      link.breakdown.quantity > 0 &&
      link.breakdown.unit &&
      link.breakdown.reportUnitPrice >= 0 &&
      link.breakdown.billingUnitPrice >= 0
    );
  },

  // Check if cost link has detailed breakdown available
  hasDetailedCostBreakdown: (link: {
    breakdown?: {
      quantity: number;
      unit: string;
      reportUnitPrice: number;
      costUnitPrice: number;
    };
  }): boolean => {
    return !!(
      link.breakdown &&
      link.breakdown.quantity > 0 &&
      link.breakdown.unit &&
      link.breakdown.reportUnitPrice >= 0 &&
      link.breakdown.costUnitPrice >= 0
    );
  },

  // Check if link has exchange rate information (for cost links)
  hasExchangeRateInfo: (link: {
    breakdown?: { exchangeRate: number };
  }): boolean => {
    return !!(
      link.breakdown &&
      link.breakdown.exchangeRate &&
      link.breakdown.exchangeRate > 0
    );
  },

  // Calculate profit margin from billing breakdown
  calculateMarginFromBillingBreakdown: (breakdown: {
    quantity: number;
    reportUnitPrice: number;
    billingUnitPrice: number;
    reportCurrency: string;
    billingCurrency: string;
  }): { marginAmount: number; marginPercentage: number } | null => {
    // Can only calculate margin if currencies are the same
    // Different currencies have fixed rates that don't use exchange rates for margin calculation
    if (breakdown.reportCurrency !== breakdown.billingCurrency) {
      return null; // Cannot calculate margin between different currencies with fixed pricing
    }

    const reportAmount = breakdown.quantity * breakdown.reportUnitPrice;
    const billingAmount = breakdown.quantity * breakdown.billingUnitPrice;

    const marginAmount = billingAmount - reportAmount;
    const marginPercentage =
      reportAmount > 0 ? (marginAmount / reportAmount) * 100 : 0;

    return {
      marginAmount: Math.round(marginAmount * 100) / 100,
      marginPercentage: Math.round(marginPercentage * 100) / 100, // 2 decimal places
    };
  },

  // Calculate actual cost vs reported cost (no margin applied)
  calculateCostVarianceFromBreakdown: (breakdown: {
    quantity: number;
    reportUnitPrice: number;
    costUnitPrice: number;
    exchangeRate: number;
    reportCurrency: string;
    costCurrency: string;
  }): { varianceAmount: number; variancePercentage: number } => {
    // Convert both amounts to a common currency for comparison
    const reportAmount = breakdown.quantity * breakdown.reportUnitPrice;

    let costAmount: number;
    if (breakdown.reportCurrency === breakdown.costCurrency) {
      costAmount = breakdown.quantity * breakdown.costUnitPrice;
    } else {
      // Convert cost to report currency
      costAmount =
        (breakdown.quantity * breakdown.costUnitPrice) / breakdown.exchangeRate;
    }

    const varianceAmount = costAmount - reportAmount;
    const variancePercentage =
      reportAmount > 0 ? (varianceAmount / reportAmount) * 100 : 0;

    return {
      varianceAmount: Math.round(varianceAmount * 100) / 100,
      variancePercentage: Math.round(variancePercentage * 100) / 100, // 2 decimal places
    };
  },
};

// Exchange rate information
export interface ExchangeRateInfo {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  date?: string; // ISO date string
}

// Validation and calculation helpers
export const ReportValidation = {
  isValidUnit: (unit: string): unit is ReportUnit => {
    return typeof unit === "string" && unit.length > 0;
  },

  isValidQuantity: (quantity: number): boolean => {
    return typeof quantity === "number" && quantity >= 0;
  },

  isValidUnitPrice: (unitPrice: number): boolean => {
    return typeof unitPrice === "number" && unitPrice >= 0;
  },

  // Check if report has detailed breakdown available
  hasDetailedBreakdown: (report: {
    unit?: Nullable<string>;
    quantity?: Nullable<number>;
    unitPrice?: Nullable<number>;
  }): boolean => {
    return !!(
      report.unit &&
      report.quantity !== null &&
      report.quantity !== undefined &&
      report.unitPrice !== null &&
      report.unitPrice !== undefined
    );
  },

  // Calculate net value from breakdown (for syncing)
  calculateNetValueFromBreakdown: (
    quantity: number,
    unitPrice: number,
  ): number => {
    return Math.round(quantity * unitPrice * 100) / 100; // Round to 2 decimal places
  },

  // Calculate breakdown from net value (reverse calculation)
  calculateBreakdownFromNetValue: (
    netValue: number,
    _unit: string,
    quantity: number,
  ): { unitPrice: number } => {
    const unitPrice =
      quantity > 0 ? Math.round((netValue / quantity) * 100) / 100 : 0;
    return { unitPrice };
  },

  // Sync breakdown fields with net value
  syncBreakdownWithNetValue: (report: {
    netValue: number;
    unit?: Nullable<string>;
    quantity?: Nullable<number>;
    unitPrice?: Nullable<number>;
  }): { unit?: string; quantity?: number; unitPrice?: number } => {
    if (ReportValidation.hasDetailedBreakdown(report)) {
      // Return the current breakdown values
      // Note: Validation that quantity × unitPrice = netValue is handled in form submission
      return {
        unit: maybe.getOrUndefined(report.unit),
        quantity: maybe.getOrUndefined(report.quantity),
        unitPrice: maybe.getOrUndefined(report.unitPrice),
      };
    }
    return {};
  },
};

// Display helpers for UI components
export const ReportDisplay = {
  // Format unit for display
  formatUnit: (unit: string): string => {
    switch (unit) {
      case "h":
        return "hours";
      case "d":
        return "days";
      case "pc":
        return "pieces";
      default:
        return unit;
    }
  },

  // Format breakdown for display (e.g., "50 hours × 100 PLN/h = 5000 PLN")
  formatDetailedBreakdown: (
    quantity: number,
    unit: string,
    unitPrice: number,
    currency: string,
  ): string => {
    const unitName = ReportDisplay.formatUnit(unit);
    return `${quantity} ${unitName} × ${unitPrice} ${currency.toUpperCase()}/${unit} = ${ReportValidation.calculateNetValueFromBreakdown(quantity, unitPrice)} ${currency.toUpperCase()}`;
  },

  // Get display text for report (detailed if available, simple otherwise)
  getReportDisplayText: (report: {
    netValue: number;
    currency: string;
    unit?: Nullable<string>;
    quantity?: Nullable<number>;
    unitPrice?: Nullable<number>;
  }): string => {
    if (ReportValidation.hasDetailedBreakdown(report)) {
      return ReportDisplay.formatDetailedBreakdown(
        report.quantity!,
        report.unit!,
        report.unitPrice!,
        report.currency,
      );
    }
    return `${report.netValue} ${report.currency.toUpperCase()}`;
  },

  // Get display text for billing link
  getBillingLinkDisplayText: (
    link: {
      reportAmount: number;
      billingAmount: number;
      breakdown?: {
        quantity: number;
        unit: string;
        reportUnitPrice: number;
        billingUnitPrice: number;
        reportCurrency: string;
        billingCurrency: string;
      };
    },
    reportCurrency: string,
    billingCurrency: string,
  ): string => {
    if (LinkValidation.hasDetailedBillingBreakdown(link) && link.breakdown) {
      let text = `${link.breakdown.quantity} ${ReportDisplay.formatUnit(link.breakdown.unit)}`;
      text += ` (${link.breakdown.reportUnitPrice} ${link.breakdown.reportCurrency.toUpperCase()}/h → `;
      text += `${link.breakdown.billingUnitPrice} ${link.breakdown.billingCurrency.toUpperCase()}/h)`;

      // Calculate and show margin (only possible for same currency)
      const margin = LinkValidation.calculateMarginFromBillingBreakdown(
        link.breakdown,
      );

      if (margin && margin.marginAmount !== 0) {
        const sign = margin.marginAmount > 0 ? "+" : "";
        text += ` (${sign}${margin.marginAmount} ${link.breakdown.reportCurrency.toUpperCase()} / ${margin.marginPercentage}% margin)`;
      }

      return text;
    }

    return `${link.reportAmount} ${reportCurrency.toUpperCase()} → ${link.billingAmount} ${billingCurrency.toUpperCase()}`;
  },

  // Get display text for cost link
  getCostLinkDisplayText: (
    link: {
      reportAmount: number;
      costAmount: number;
      breakdown?: {
        quantity: number;
        unit: string;
        reportUnitPrice: number;
        costUnitPrice: number;
        exchangeRate: number;
        reportCurrency: string;
        costCurrency: string;
      };
    },
    reportCurrency: string,
    costCurrency: string,
  ): string => {
    if (LinkValidation.hasDetailedCostBreakdown(link) && link.breakdown) {
      let text = `${link.breakdown.quantity} ${ReportDisplay.formatUnit(link.breakdown.unit)}`;
      text += ` (${link.breakdown.reportUnitPrice} ${link.breakdown.reportCurrency.toUpperCase()}/h → `;
      text += `${link.breakdown.costUnitPrice} ${link.breakdown.costCurrency.toUpperCase()}/h)`;

      if (link.breakdown.exchangeRate !== 1) {
        text += ` (${link.breakdown.exchangeRate}x rate)`;
      }

      // Show variance between reported and actual costs (not margin)
      const variance = LinkValidation.calculateCostVarianceFromBreakdown(
        link.breakdown,
      );

      if (variance.varianceAmount !== 0) {
        const sign = variance.varianceAmount > 0 ? "+" : "";
        text += ` (${sign}${variance.varianceAmount} ${link.breakdown.reportCurrency.toUpperCase()} / ${variance.variancePercentage}% variance)`;
      }

      return text;
    }

    return `${link.reportAmount} ${reportCurrency.toUpperCase()} → ${link.costAmount} ${costCurrency.toUpperCase()}`;
  },
};

export interface ReportPayload {
  contractorId: number;
  periodStart: CalendarDate;
  periodEnd: CalendarDate;
  clientId: number;
  workspaceId: number;

  description: string;
  netValue: number; // Primary field - total amount (backward compatible)

  // Enhanced breakdown fields (optional, for better UI when available)
  unit?: Nullable<string>; // e.g., "h", "d", "pc" (hours/days/pieces)
  quantity?: Nullable<number>; // e.g., 100
  unitPrice?: Nullable<number>; // e.g., 35 (currency per unit)

  currency: string;

  projectIterationId: Nullable<ProjectIteration["id"]>;
}

export interface ReportBase extends ReportPayload {
  id: number;
  createdAt: string;
  isCommitted: boolean;
}

export type Report = ReportBase & {
  contractor: ContractorBase;
  client: Client;
  linkBillingReport: {
    link: LinkBillingReport;
    billing: Nullable<BillingBase>;
  }[];
  linkCostReport: { link: LinkCostReport; cost: Nullable<CostBase> }[];
  // todo: add billingById, costById - relevant entities in a map
  // Total billing value linked to the report
  reportBillingValue: number; // total_billing_billing_value
  // Remaining report value that should be billed (positive = to bill, negative = overbilled)
  reportBillingBalance: number; // report_billing_balance
  // Total cost value linked to the report
  reportCostValue: number; // total_cost_cost_value
  // Remaining report value that should be costed (positive = to cost, negative = overcosted)
  reportCostBalance: number; // report_cost_balance
  // Difference between billing and cost values (positive = profit, negative = loss)
  billingCostBalance: number; // billing_cost_balance
  // Whether the report has immediate payment due (it is billingCostBalance but clamped to the reported value, if reported value is less than billed value)
  immediatePaymentDue: number; // immediate_payment_due
  previousReport: Nullable<ReportBase>;
  // Note: Enhanced breakdown fields (unit?, quantity?, unitPrice?) are inherited from ReportPayload
};

export type ReportQuery = WithFilters<{
  clientId: Nullable<EnumFilter<Client["id"]>>;
  workspaceId: Nullable<EnumFilter<Workspace["id"]>>;
  remainingAmount: Nullable<NumberFilter>;
  contractorId: Nullable<EnumFilter<Nullable<Contractor["id"]>>>;
  period: Nullable<DateFilter>;
  immediatePaymentDue: Nullable<NumberFilter>;
  projectIterationId: Nullable<EnumFilter<Nullable<ProjectIteration["id"]>>>;
  id: Nullable<EnumFilter<Report["id"]>>;
  commitState: Nullable<BooleanFilter>;
}> &
  WithPagination &
  WithSorter<
    | "period"
    | "netValue"
    | "contractor"
    | "workspace"
    | "client"
    | "reportBillingValue"
    | "remainingAmount"
    | "immediatePaymentDue"
    | "reportCostBalance"
    | "description"
  >;

const strToNull = (str: unknown) => (str === "" ? null : str);

export const reportQuerySchema = z
  .object({
    filters: z.object({
      clientId: z
        .preprocess(strToNull, enumFilterSchema(z.coerce.number()).nullable())
        .default(null),
      workspaceId: z
        .preprocess(strToNull, enumFilterSchema(z.coerce.number()).nullable())
        .default(null),
      remainingAmount: z
        .preprocess(strToNull, numberFilterSchema.nullable())
        .default(null),
      contractorId: z
        .preprocess(
          strToNull,
          enumFilterSchema(
            z.preprocess(strToNull, z.coerce.number().nullable()),
          ).nullable(),
        )
        .default(null),
      period: z
        .preprocess(strToNull, dateFilterSchema.nullable())
        .default(null),
      immediatePaymentDue: z
        .preprocess(strToNull, numberFilterSchema.nullable())
        .default(null),
      projectIterationId: z
        .preprocess(
          strToNull,
          enumFilterSchema(
            z.preprocess(strToNull, z.coerce.number().nullable()),
          ).nullable(),
        )
        .default(null),
      id: z
        .preprocess(strToNull, enumFilterSchema(z.coerce.number()).nullable())
        .default(null),
      commitState: z
        .preprocess(strToNull, booleanFilterSchema.nullable())
        .default(null),
    }),
    page: paginationSchema,
    sort: z
      .preprocess(
        strToNull,
        z
          .object({
            field: z.enum([
              "period",
              "netValue",
              "contractor",
              "workspace",
              "client",
              "reportBillingValue",
              "remainingAmount",
              "immediatePaymentDue",
              "reportCostBalance",
              "description",
            ]),
            order: z.enum(["asc", "desc"]),
          })
          .nullable(),
      )
      .default(null),
  })
  .catch((e) => {
    console.error(e);
    return reportQueryUtils.ofDefault(idSpecUtils.ofAll(), idSpecUtils.ofAll());
  });

export interface ReportApi {
  getReports: (query: ReportQuery) => Promise<Report[]>;
  getReport: (id: number) => Promise<Report>;
}

export const reportQueryUtils = withBuilderUtils({
  ...withFiltersUtils<ReportQuery>(),
  ...withPaginationUtils<ReportQuery>(),
  ...withSorterUtils<ReportQuery>(),
  ofDefault: (workspaceId: WorkspaceSpec, clientId: ClientSpec): ReportQuery =>
    reportQueryUtils.ensureDefault(
      {
        filters: {
          workspaceId: null,
          clientId: null,
          remainingAmount: null,
          contractorId: null,
          period: null,
          immediatePaymentDue: null,
          projectIterationId: null,
          id: null,
          commitState: null,
        },
        page: { page: 0, pageSize: 10 },
        sort: { field: "period", order: "asc" },
      },
      workspaceId,
      clientId,
    ),
  ensureDefault: (
    query: ReportQuery,
    workspaceId: WorkspaceSpec,
    clientId: ClientSpec,
  ): ReportQuery => ({
    ...query,
    filters: {
      ...query.filters,
      workspaceId: idSpecUtils.mapSpecificOrElse(
        workspaceId,
        (x) => ({
          operator: "oneOf",
          value: [x],
        }),
        query.filters.workspaceId,
      ),
      clientId: idSpecUtils.mapSpecificOrElse(
        clientId,
        (x) => ({
          operator: "oneOf",
          value: [x],
        }),
        query.filters.clientId,
      ),
    },
  }),
  narrowContext: (
    query: ReportQuery,
    context: ExpressionContext,
  ): ReportQuery =>
    chain(query)
      .thru((x) =>
        idSpecUtils.isAll(context.workspaceId)
          ? x
          : reportQueryUtils.setFilter(x, "workspaceId", {
              operator: "oneOf",
              value: [context.workspaceId],
            }),
      )
      .thru((x) =>
        idSpecUtils.isAll(context.clientId)
          ? x
          : reportQueryUtils.setFilter(x, "clientId", {
              operator: "oneOf",
              value: [context.clientId],
            }),
      )
      .thru((x) =>
        idSpecUtils.isAll(context.contractorId)
          ? x
          : reportQueryUtils.setFilter(x, "contractorId", {
              operator: "oneOf",
              value: [context.contractorId],
            }),
      )
      .value(),
}).setInitialQueryFactory((api) => api.ofDefault);
