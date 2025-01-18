import {
  ClientBilling,
  ClientBillingBase,
} from "@/api/client-billing/client-billing.api.ts";
import { ContractorReportBase } from "@/api/contractor-reports/contractor-reports.api.ts";
import { assert } from "@/platform/lang/assert.ts";
import { CurrencyValue } from "@/services/ExchangeService/ExchangeService.ts";

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
      billingId: null;
    }
  | {
      linkType: "clarify"; // todo we want clarify-report and clarify-billing
      description: string;
      billingId: number;
      // references to the linked entities
      billingAmount: number;
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

export const linkBillingReportUtils = {
  getLinkValue(side: "report" | "billing", link: LinkBillingReportBase) {
    if (link.linkType === "reconcile") {
      return side === "report" ? link.reportAmount : link.billingAmount;
    } else {
      assert(link.linkType === "clarify");
      if (side === "report") {
        // when asking for report links, we do not expect clarifications of billing
        assert(link.reportId !== null);
        return link.reportAmount;
      } else {
        // when asking for billing links, we do not expect clarifications of report
        assert(link.billingId !== null);
        return link.billingAmount;
      }
    }
  },
};
