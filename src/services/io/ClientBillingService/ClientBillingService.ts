import {
  ClientBilling,
  ClientBillingQuery,
} from "@/api/client-billing/client-billing.api.ts";
import { RemoteData } from "@passionware/monads";

export interface ClientBillingService {
  useClientBillings(query: ClientBillingQuery): RemoteData<ClientBilling[]>;
}

export interface WithClientBillingService {
  clientBillingService: ClientBillingService;
}
