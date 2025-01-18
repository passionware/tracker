import {
  ClientBilling,
  ClientBillingBase,
} from "@/api/client-billing/client-billing.api.ts";
import { ContractorReportBase } from "@/api/contractor-reports/contractor-reports.api.ts";

export type LinkBillingReportBase = {
  id: number;
  createdAt: string;
} & (
  | {
      linkType: "reconcile";
      billingId: number;
      reportId: number;
      reportAmount: number;
      billingAmount: number;
      description: string;
    }
  | {
      linkType: "clarify"; // todo we want clarify-report and clarify-billing
      description: string;
      reportId: number;
      reportAmount: number;
      billingAmount: null;
      billingId: null;
    }
  | {
      linkType: "clarify"; // todo we want clarify-report and clarify-billing
      description: string;
      billingId: number;
      // references to the linked entities
      billingAmount: number;
      reportAmount: null;
      reportId: null;
    }
);

export type LinkBillingReport =
  | (Extract<LinkBillingReportBase, { linkType: "reconcile" }> & {
      billing: ClientBillingBase;
      report: ContractorReportBase;
    })
  | (Extract<
      LinkBillingReportBase,
      { linkType: "clarify"; billingId: number; reportId: null }
    > & {
      billing: ClientBilling;
      report: null;
    })
  | (Extract<
      LinkBillingReportBase,
      { linkType: "clarify"; reportId: number; billingId: null }
    > & {
      billing: null;
      report: ContractorReportBase;
    });
