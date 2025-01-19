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
});

export type LinkBillingReport$ = z.input<typeof linkBillingReport$>;

export function linkBillingReportFromHttp(
  linkBillingReport: LinkBillingReport$,
): LinkBillingReport {
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
    };
  }
  throw new Error("Invalid linkBillingReport");
}
