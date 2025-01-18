import { contractorReportBaseFromHttp } from "@/api/contractor-reports/contractor-reports.api.http.schema.base.ts";
import {
  ContractorReport$,
  contractorReport$,
} from "@/api/contractor-reports/contractor-reports.api.http.schema.ts";
import {
  linkBillingReportBase$,
  linkBillingReportBaseFromHttp,
} from "@/api/link-billing-report/link-billing-report.http.schema.base.ts";
import { maybe } from "@passionware/monads";
import { z } from "zod";
import {
  ClientBilling$,
  clientBilling$,
  clientBillingFromHttp,
} from "../client-billing/client-billing.api.http.schema.ts";
import { LinkBillingReport } from "./link-billing-report.api.ts";

export type LinkBillingReport$ = z.input<typeof linkBillingReportBase$> & {
  billing?: ClientBilling$ | null;
  report?: ContractorReport$ | null;
};

export const linkBillingReport$ = linkBillingReportBase$.extend({
  billing: z.lazy(() => clientBilling$.nullable()),
  reports: z.lazy(() => contractorReport$.nullable()),
});

export function linkBillingReportFromHttp(
  linkBillingReport: LinkBillingReport$,
): LinkBillingReport {
  const base = linkBillingReportBaseFromHttp(linkBillingReport);
  switch (base.linkType) {
    case "reconcile": {
      return {
        ...base,
        report: maybe.mapOrThrow(
          linkBillingReport.report,
          contractorReportBaseFromHttp,
          "A report is required for reconcile link type",
        ),
        billing: maybe.mapOrThrow(
          linkBillingReport.billing,
          clientBillingFromHttp,
          "A billing is required for reconcile link type",
        ),
      };
    }
    case "clarify": {
      if (maybe.isPresent(linkBillingReport.billing_id)) {
        return {
          ...base,
          billing: maybe.mapOrThrow(
            linkBillingReport.billing,
            clientBillingFromHttp,
            "A billing is required for clarify link type",
          ),
          billingAmount: maybe.getOrThrow(
            linkBillingReport.billing_amount,
            "billing_amount is required for clarify link type",
          ),
          billingId: linkBillingReport.billing_id,
          reportId: null,
          report: null,
        };
      } else if (maybe.isPresent(linkBillingReport.report_id)) {
        return {
          ...base,
          report: maybe.mapOrThrow(
            linkBillingReport.report,
            contractorReportBaseFromHttp,
            "A report is required for clarify link type",
          ),
          reportAmount: maybe.getOrThrow(
            linkBillingReport.report_amount,
            "report_amount is required for clarify link type",
          ),
          reportId: linkBillingReport.report_id,
          billingId: null,
          billing: null,
        };
      }
      throw new Error("Invalid linkBillingReport");
    }
  }
}
