import { clientBilling$ } from "@/api/client-billing/client-billing.api.http.schema.ts";
import {
  ContractorReport,
  LinkBillingReport,
} from "@/api/contractor-reports/contractor-reports.api.ts";
import {
  contractor$,
  contractorFromHttp,
} from "@/api/contractor/contractor.api.http.schema.ts";
import { maybe } from "@passionware/monads";
import camelcaseKeys from "camelcase-keys";
import { z } from "zod";
export const linkBillingReport$ = z.object({
  id: z.number(),
  created_at: z.string(),
  client_billing_id: z.number().nullable(),
  contractor_report_id: z.number().nullable(),
  reconcile_amount: z.number().nullable(),
  link_type: z.string().nullable(),
  clarify_justification: z.string().nullable(),
  client_billing: clientBilling$.nullable(),
});

export type LinkBillingReport$ = z.infer<typeof linkBillingReport$>;

export function linkBillingReportFromHttp(
  linkBillingReport: LinkBillingReport$,
): LinkBillingReport {
  return {
    ...camelcaseKeys(linkBillingReport),
    clientBilling: linkBillingReport.client_billing
      ? { ...camelcaseKeys(linkBillingReport.client_billing) }
      : null,
  };
}
export const contractorReport$ = z.object({
  id: z.number(),
  created_at: z.string(),
  contractor_id: z.number(),
  description: z.string().default(""),
  net_value: z.number(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  currency: z.string().default("?"),
  client_id: z.number(),
  link_billing_report: z.array(linkBillingReport$).default([]),
  contractors: contractor$.nullable(),
});

export type ContractorReport$ = z.infer<typeof contractorReport$>;

export function contractorReportFromHttp(
  contractorReport: ContractorReport$,
): ContractorReport {
  return {
    ...camelcaseKeys(contractorReport),
    linkBillingReport: contractorReport.link_billing_report.map(
      linkBillingReportFromHttp,
    ),
    contractor: maybe.mapOrNull(
      contractorReport.contractors,
      contractorFromHttp,
    ),
  };
}
