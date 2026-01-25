import { Nullable } from "@/platform/typescript/Nullable.ts";

// Detailed breakdown structure for enhanced cost linking (tracks variance, not margins)
export interface LinkCostBreakdown {
  quantity: number; // linked quantity (e.g., 50 hours - same for both sides)
  unit: string; // unit type (e.g., "h" for hours)
  reportUnitPrice: number; // unit price from report (e.g., 1000 EUR total / 50 hours = 20 EUR/h)
  costUnitPrice: number; // actual cost per unit paid (e.g., 4000 PLN total / 50 hours = 80 PLN/h)
  exchangeRate: number; // exchange rate used for currency conversion (e.g., 4.0)
  reportCurrency: string; // report currency snapshot
  costCurrency: string; // cost currency snapshot
}

// todo: make it exclusively nullable for clarifications, as in other link payloads
export interface LinkCostReportPayload {
  costAmount: number; // Primary field - amount from cost
  reportAmount: number; // Primary field - amount from report
  description: string;
  costId: Nullable<number>;
  reportId: Nullable<number>;

  // Enhanced linking breakdown (optional, all-or-nothing)
  breakdown?: LinkCostBreakdown;
}

export interface LinkCostReport extends LinkCostReportPayload {
  id: number;
  createdAt: Date;

  // Computed fields for validation (optional, computed by database)
  calculatedReportAmount?: number; // reportQuantity * reportUnitPrice
  calculatedCostAmount?: number; // costQuantity adjusted for exchange/margin
}
