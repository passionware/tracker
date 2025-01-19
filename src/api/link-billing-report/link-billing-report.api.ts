export type LinkBillingReportPayload =
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
    };

export type LinkBillingReport = {
  id: number;
  createdAt: string;
} & LinkBillingReportPayload;
