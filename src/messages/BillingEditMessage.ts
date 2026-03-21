import { BillingInvoicePayload } from "@/api/billing/billing.api.ts";

export interface BillingEditMessage {
  request: {
    defaultValues: Partial<BillingInvoicePayload>;
    operatingMode: "create" | "edit" | "duplicate";
  };
  response:
    | {
        action: "cancel";
      }
    | {
        action: "confirm";
        payload: BillingInvoicePayload;
        changes: Partial<BillingInvoicePayload>;
      };
}
