import {
  clientBilling$,
  clientBillingFromHttp,
} from "@/api/client-billing/client-billing.api.http.schema.ts";
import { ClientBillingApi } from "@/api/client-billing/client-billing.api.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export function createClientBillingApi(
  client: SupabaseClient,
): ClientBillingApi {
  return {
    getClientBillings: async (query) => {
      let request = client.from("client_billing").select(`
      *,
      link_billing_report (
        *,
        contractor_reports (
          *,
          contractors (*)
        )
      )
    `);
      if (query.filters.clientId) {
        switch (query.filters.clientId.operator) {
          case "oneOf":
            request = request.in("client_id", query.filters.clientId.value);
            break;
          case "matchNone": // opposite of oneOf
            request = request.not(
              "client_id",
              "in",
              query.filters.clientId.value,
            );
            break;
        }
      }

      const { data, error } = await request;
      if (error) {
        throw error;
      }
      return z.array(clientBilling$).parse(data).map(clientBillingFromHttp);
    },
  };
}
