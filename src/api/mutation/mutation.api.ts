export type ClarifyLinkPayload = {
  contractorReportId: number;
  clarifyJustification: string;
  clarifyAmount: number;
};

export interface MutationApi {
  linkReportAndBilling: (payload: {
    clientBillingId: number;
    contractorReportId: number;
    reconcileAmount: number;
  }) => Promise<void>;
  clarifyLink: (payload: ClarifyLinkPayload) => Promise<void>;
}
