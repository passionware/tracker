// Detailed breakdown structure for enhanced billing linking
export interface LinkBillingBreakdown {
  quantity: number; // linked quantity (e.g., 50 hours - same for both sides)
  unit: string; // unit type (e.g., "h" for hours)
  reportUnitPrice: number; // unit price from report (e.g., 100 PLN/h)
  billingUnitPrice: number; // unit price for billing (e.g., 35 EUR/h)
  reportCurrency: string; // report currency snapshot for audit
  billingCurrency: string; // billing currency snapshot for audit
}

export type ReconcileLinkBillingReportPayload = {
  linkType: "reconcile";
  billingId: number;
  reportId: number;
  reportAmount: number; // Primary field - amount from report
  billingAmount: number; // Primary field - amount from billing
  description: string;
  breakdown?: LinkBillingBreakdown;
};

export type LinkBillingReportPayload =
  | ReconcileLinkBillingReportPayload
  | {
      linkType: "clarify"; // todo we want clarify-report and clarify-billing
      description: string;
      reportId: number;
      reportAmount: number; // Primary field
      billingAmount: null;
      billingId: null;

      // Clarifications may not need precise linking
      breakdown?: LinkBillingBreakdown;
    }
  | {
      linkType: "clarify"; // todo we want clarify-report and clarify-billing
      description: string;
      billingId: number;
      // references to the linked entities
      billingAmount: number; // Primary field
      reportAmount: null;
      reportId: null;

      // Clarifications may not need precise linking
      breakdown?: LinkBillingBreakdown;
    };

export type LinkBillingReport = {
  id: number;
  createdAt: string;
} & LinkBillingReportPayload;
