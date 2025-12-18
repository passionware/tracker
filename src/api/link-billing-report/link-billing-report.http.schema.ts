import { LinkBillingReport } from "@/api/link-billing-report/link-billing-report.api.ts";
import { maybe } from "@passionware/monads";
import { z } from "zod";

export const linkBillingReport$ = z.object({
  id: z.number(),
  created_at: z.string(),
  billing_id: z.number().nullable(),
  report_id: z.number().nullable(),
  report_amount: z.number().nullable(),
  billing_amount: z.number().nullable(),
  description: z.string().nullable(),
  // Breakdown fields
  d_quantity: z.number().nullable(),
  d_unit: z.string().nullable(),
  d_report_unit_price: z.number().nullable(),
  d_billing_unit_price: z.number().nullable(),
  d_report_currency: z.string().nullable(),
  d_billing_currency: z.string().nullable(),
});

export type LinkBillingReport$ = z.input<typeof linkBillingReport$>;

export function linkBillingReportFromHttp(
  linkBillingReport: LinkBillingReport$,
): LinkBillingReport {
  // Helper to create breakdown object if fields are present
  const createBreakdown = () => {
    if (
      linkBillingReport.d_quantity !== null &&
      linkBillingReport.d_unit !== null &&
      linkBillingReport.d_report_unit_price !== null &&
      linkBillingReport.d_billing_unit_price !== null &&
      linkBillingReport.d_report_currency !== null &&
      linkBillingReport.d_billing_currency !== null
    ) {
      return {
        quantity: linkBillingReport.d_quantity,
        unit: linkBillingReport.d_unit,
        reportUnitPrice: linkBillingReport.d_report_unit_price,
        billingUnitPrice: linkBillingReport.d_billing_unit_price,
        reportCurrency: linkBillingReport.d_report_currency,
        billingCurrency: linkBillingReport.d_billing_currency,
      };
    }
    return undefined;
  };

  if (
    maybe.isPresent(linkBillingReport.billing_id) &&
    maybe.isPresent(linkBillingReport.report_id)
  ) {
    // reconcile
    return {
      id: linkBillingReport.id,
      createdAt: linkBillingReport.created_at,
      linkType: "reconcile",
      reportAmount: maybe.getOrThrow(
        linkBillingReport.report_amount,
        'report_amount is required for linkType "reconcile"',
      ),
      billingAmount: maybe.getOrThrow(
        linkBillingReport.billing_amount,
        'billing_amount is required for linkType "reconcile"',
      ),
      billingId: maybe.getOrThrow(
        linkBillingReport.billing_id,
        'billing_id is required for linkType "reconcile"',
      ),
      reportId: maybe.getOrThrow(
        linkBillingReport.report_id,
        'report_id is required for linkType "reconcile"',
      ),
      description: linkBillingReport.description ?? "",
      breakdown: createBreakdown(),
    };
  }
  if (linkBillingReport.billing_id !== null) {
    return {
      id: linkBillingReport.id,
      createdAt: linkBillingReport.created_at,
      linkType: "clarify",
      description: maybe.getOrThrow(
        linkBillingReport.description,
        'description is required for linkType "clarify"',
      ),
      billingId: linkBillingReport.billing_id,
      billingAmount: maybe.getOrThrow(
        linkBillingReport.billing_amount,
        'billing_amount is required for linkType "clarify"',
      ),
      reportId: null,
      reportAmount: null,
      breakdown: createBreakdown(),
    };
  }
  if (linkBillingReport.report_id !== null) {
    return {
      id: linkBillingReport.id,
      createdAt: linkBillingReport.created_at,
      linkType: "clarify",
      description: maybe.getOrThrow(
        linkBillingReport.description,
        'description is required for linkType "clarify"',
      ),
      reportId: linkBillingReport.report_id,
      reportAmount: maybe.getOrThrow(
        linkBillingReport.report_amount,
        'report_amount is required for linkType "clarify"',
      ),
      billingId: null,
      billingAmount: null,
      breakdown: createBreakdown(),
    };
  }
  throw new Error("Invalid linkBillingReport");
}
