import { Billing, BillingQuery } from "@/api/billing/billing.api.ts";
import { Maybe, RemoteData } from "@passionware/monads";

export interface BillingService {
  useBillings(query: Maybe<BillingQuery>): RemoteData<Billing[]>;
  useBilling(id: Maybe<Billing["id"]>): RemoteData<Billing>;
}

export interface WithBillingService {
  billingService: BillingService;
}
