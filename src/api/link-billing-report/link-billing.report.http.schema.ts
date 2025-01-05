import {
  ContractorReport$,
  contractorReport$,
  contractorReportFromHttp,
} from "@/api/contractor-reports/contractor-reports.api.http.schema.ts";
import {
  Contractor$,
  contractor$,
  contractorFromHttp,
} from "@/api/contractor/contractor.api.http.schema.ts";
import {
  ClientBilling$,
  clientBilling$,
  clientBillingFromHttp,
} from "../client-billing/client-billing.api.http.schema.ts";
import { LinkBillingReport } from "./link-billing-report.api.ts";
import { maybe } from "@passionware/monads";
import camelcaseKeys from "camelcase-keys";
import { z } from "zod";

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
  contractor?: Contractor$ | null;
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
  return {
    ...camelcaseKeys(linkBillingReport),
    clientBilling: maybe.mapOrNull(
      linkBillingReport.client_billing,
      clientBillingFromHttp,
    ),
    contractor: maybe.mapOrNull(
      linkBillingReport.contractor,
      contractorFromHttp,
    ),
    contractorReport: maybe.mapOrNull(
      linkBillingReport.contractor_reports,
      contractorReportFromHttp,
    ),
  };
}
