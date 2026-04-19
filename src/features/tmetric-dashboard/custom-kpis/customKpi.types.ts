import { z } from "zod";

export const CUSTOM_KPI_DISPLAYS = [
  "currency",
  "number",
  "hours",
  "percent",
] as const;
export type CustomKpiDisplay = (typeof CUSTOM_KPI_DISPLAYS)[number];

/**
 * Variables exposed to formulas.
 * - "scoped" variables respect the optional `contractorIds` filter on the KPI.
 * - "total" variables always aggregate over all contractors in the dashboard scope.
 */
export const CUSTOM_KPI_SCOPED_VARIABLES = [
  "cost",
  "billing",
  "profit",
  "hours",
  "entries",
] as const;
export type CustomKpiScopedVariable = (typeof CUSTOM_KPI_SCOPED_VARIABLES)[number];

export const CUSTOM_KPI_TOTAL_VARIABLES = [
  "totalCost",
  "totalBilling",
  "totalProfit",
  "totalHours",
  "totalEntries",
] as const;
export type CustomKpiTotalVariable = (typeof CUSTOM_KPI_TOTAL_VARIABLES)[number];

export type CustomKpiVariable =
  | CustomKpiScopedVariable
  | CustomKpiTotalVariable;

export const CUSTOM_KPI_VARIABLES: readonly CustomKpiVariable[] = [
  ...CUSTOM_KPI_SCOPED_VARIABLES,
  ...CUSTOM_KPI_TOTAL_VARIABLES,
];

/** Variables whose underlying source is a multi-currency budget that needs FX conversion. */
export const CUSTOM_KPI_CURRENCY_VARIABLES: ReadonlySet<CustomKpiVariable> =
  new Set([
    "cost",
    "billing",
    "profit",
    "totalCost",
    "totalBilling",
    "totalProfit",
  ]);

export interface CustomDashboardKpi {
  id: string;
  name: string;
  description?: string;
  formula: string;
  contractorIds?: number[];
  display: CustomKpiDisplay;
  baseCurrency: string;
}

export const customDashboardKpiSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  formula: z.string(),
  contractorIds: z.array(z.number()).optional(),
  display: z.enum(CUSTOM_KPI_DISPLAYS),
  baseCurrency: z.string().min(1),
});

export const customDashboardKpisSchema = z.array(customDashboardKpiSchema);

export const VARIABLE_DESCRIPTIONS: Record<CustomKpiVariable, string> = {
  cost: "Cost across selected contractors (or all if no filter set), converted to base currency",
  billing:
    "Billing across selected contractors (or all if no filter set), converted to base currency",
  profit:
    "Billing minus cost across selected contractors (or all if no filter set), converted to base currency",
  hours: "Hours across selected contractors (or all if no filter set)",
  entries: "Time entries across selected contractors (or all if no filter set)",
  totalCost:
    "Cost across all contractors in scope, converted to base currency",
  totalBilling:
    "Billing across all contractors in scope, converted to base currency",
  totalProfit:
    "Billing minus cost across all contractors in scope, converted to base currency",
  totalHours: "Hours across all contractors in scope",
  totalEntries: "Time entries across all contractors in scope",
};
