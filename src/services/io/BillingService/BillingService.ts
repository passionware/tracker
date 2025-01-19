import { Billing, BillingQuery } from "@/api/billing/billing.api.ts";
import { RemoteData } from "@passionware/monads";

export interface BillingService {
  useBillings(query: BillingQuery): RemoteData<Billing[]>;
}

export interface WithBillingService {
  billingService: BillingService;
}
