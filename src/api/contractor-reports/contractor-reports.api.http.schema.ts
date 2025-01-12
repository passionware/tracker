import { ContractorReport } from "@/api/contractor-reports/contractor-reports.api.ts";
import {
  contractor$,
  contractorFromHttp,
} from "@/api/contractor/contractor.api.http.schema.ts";

import {
  LinkBillingReport$,
  linkBillingReport$,
  linkBillingReportFromHttp,
} from "@/api/link-billing-report/link-billing.report.http.schema.ts";
import {
  linkCostReport$,
  LinkCostReport$,
  linkCostReportFromHttp,
} from "@/api/link-cost-report/link-cost-report.http.schema.ts";
import { maybe } from "@passionware/monads";
import camelcaseKeys from "camelcase-keys";
import { z } from "zod";

export const contractorReportBase$ = z.object({
  id: z.number(),
  created_at: z.string(),
  contractor_id: z.number(),
  description: z.string().default(""),
  net_value: z.number(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  currency: z.string(),
  client_id: z.number(),
  contractors: contractor$.optional(),
  workspace_id: z.number(),
});

export type ContractorReport$ = z.input<typeof contractorReportBase$> & {
  link_billing_report?: LinkBillingReport$[];
  link_cost_report?: LinkCostReport$[];
};

export const contractorReport$: z.ZodType<ContractorReport$> =
  contractorReportBase$.extend({
    link_billing_report: z.lazy(() => z.array(linkBillingReport$).optional()),
    link_cost_report: z.lazy(() => z.array(linkCostReport$).optional()),
  });

export function contractorReportFromHttp(
  contractorReport: ContractorReport$,
): ContractorReport {
  return {
    ...camelcaseKeys(contractorReport),
    description: maybe.getOrThrow(
      contractorReport.description,
      "https://github.com/colinhacks/zod/issues/2435#issuecomment-2232986074",
    ),
    linkBillingReport: maybe.mapOrNull(
      contractorReport.link_billing_report,
      (x) => x.map(linkBillingReportFromHttp),
    ),
    linkCostReport: maybe.mapOrNull(contractorReport.link_cost_report, (x) =>
      x.map(linkCostReportFromHttp),
    ),
    contractor: maybe.mapOrNull(
      contractorReport.contractors,
      contractorFromHttp,
    ),
  };
}
