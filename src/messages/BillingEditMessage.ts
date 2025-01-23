import { BillingPayload } from "@/api/billing/billing.api.ts";

export interface BillingEditMessage {
  request: {
    defaultValues: Partial<BillingPayload>;
    operatingMode: "create" | "edit" | "duplicate";
  };
  response:
    | {
        action: "cancel";
      }
    | {
        action: "confirm";
        payload: BillingPayload;
        changes: Partial<BillingPayload>;
      };
}
