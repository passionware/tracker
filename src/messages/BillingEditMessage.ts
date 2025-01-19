import { BillingPayload } from "@/api/billing/billing.api.ts";

export interface BillingEditMessage {
  request: {
    defaultValues: Partial<BillingPayload>;
  };
  response:
    | {
        action: "cancel";
      }
    | {
        action: "confirm";
        variable: BillingPayload;
        changes: Partial<BillingPayload>;
      };
}
