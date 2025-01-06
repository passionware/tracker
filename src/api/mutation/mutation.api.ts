export interface MutationApi {
  linkReportAndBilling: (payload: {
    clientBillingId: number;
    contractorReportId: number;
    reconcileAmount: number;
  }) => Promise<void>;
  clarifyLink: (payload: {
    linkBillingReportId: number;
    clarifyJustification: string;
  }) => Promise<void>;
}
