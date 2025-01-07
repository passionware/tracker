import {
  ContractorReport$,
  contractorReport$,
  contractorReportFromHttp,
} from "@/api/contractor-reports/contractor-reports.api.http.schema.ts";
import { contractor$ } from "@/api/contractor/contractor.api.http.schema.ts";
import { maybe } from "@passionware/monads";
import { z } from "zod";
import {
  ClientBilling$,
  clientBilling$,
  clientBillingFromHttp,
} from "../client-billing/client-billing.api.http.schema.ts";
import { LinkBillingReport } from "./link-billing-report.api.ts";

export const linkBillingReportBase$ = z.object({
  id: z.number(),
  created_at: z.string(),
  client_billing_id: z.number().nullable(),
  contractor_report_id: z.number().nullable(),
  reconcile_amount: z.number(),
  link_type: z.enum(["clarify"] as const).nullable(),
  clarify_justification: z.string().nullable(),
});
export type LinkBillingReport$ = z.input<typeof linkBillingReportBase$> & {
  client_billing?: ClientBilling$ | null;
  contractor_reports?: ContractorReport$ | null;
};

export const linkBillingReport$ = linkBillingReportBase$.extend({
  client_billing: z.lazy(() => clientBilling$.nullish()),
  contractor: z.lazy(() => contractor$.nullish()),
  contractor_reports: z.lazy(() => contractorReport$.nullish()),
});

export function linkBillingReportFromHttp(
  linkBillingReport: LinkBillingReport$,
): LinkBillingReport {
  switch (linkBillingReport.link_type) {
    case "clarify": {
      const base = {
        id: linkBillingReport.id,
        createdAt: linkBillingReport.created_at,
        linkType: "clarify",
        clarifyJustification: maybe.getOrThrow(
          linkBillingReport.clarify_justification,
          'clarify_justification is required for linkType "clarify"',
        ),
        linkAmount: linkBillingReport.reconcile_amount,
      } as const;
      if (linkBillingReport.client_billing_id !== null) {
        return {
          ...base,
          clientBillingId: linkBillingReport.client_billing_id,
          // references to the linked entities
          clientBilling: maybe.mapOrNull(
            linkBillingReport.client_billing,
            clientBillingFromHttp,
          ),
          contractorReportId: null,
          contractorReport: null,
        };
      }
      if (linkBillingReport.contractor_report_id !== null) {
        return {
          ...base,
          contractorReportId: linkBillingReport.contractor_report_id,
          // references to the linked entities
          contractorReport: maybe.mapOrNull(
            linkBillingReport.contractor_reports,
            contractorReportFromHttp,
          ),
          clientBilling: null,
          clientBillingId: null,
        };
      }
      throw new Error(
        'either client_billing_id or contractor_report_id must be null for linkType "clarify"',
      );
    }
    case null:
      return {
        id: linkBillingReport.id,
        createdAt: linkBillingReport.created_at,
        linkType: "reconcile",
        linkAmount: linkBillingReport.reconcile_amount,
        clientBillingId: maybe.getOrThrow(
          linkBillingReport.client_billing_id,
          'client_billing_id is required for linkType "reconcile"',
        ),
        contractorReportId: maybe.getOrThrow(
          linkBillingReport.contractor_report_id,
          'contractor_report_id is required for linkType "reconcile"',
        ),
        // references to the linked entities
        clientBilling: maybe.mapOrNull(
          linkBillingReport.client_billing,
          clientBillingFromHttp,
        ),
        contractorReport: maybe.mapOrNull(
          linkBillingReport.contractor_reports,
          contractorReportFromHttp,
        ),
      };
  }
}
