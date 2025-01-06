export type LinkPayload =
  | {
      type: "clarify";
      contractorReportId: number;
      clarifyJustification: string;
      linkAmount: number;
    }
  | {
      type: "reconcile";
      clientBillingId: number;
      contractorReportId: number;
      linkAmount: number;
    };

export interface MutationApi {
  linkReportAndBilling: (payload: LinkPayload) => Promise<void>;
}
