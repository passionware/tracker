import { billingMock } from "@/api/billing/billing.mock.ts";
import { clientsMock } from "@/api/clients/clients.mock.ts";
import { BillingService } from "@/services/io/BillingService/BillingService.ts";
import { maybe, rd } from "@passionware/monads";

export function createBillingService(): BillingService {
  return {
    useBillings: () => {
      return rd.of(
        billingMock.static.list.map((x) => ({
          ...x,
          linkReports: [],
          billingReportValue: 0,
          totalBillingValue: 0,
          billingBalance: 0,
          remainingBalance: 0,
          client: maybe.getOrThrow(
            clientsMock.static.list.find((c) => c.id === x.clientId),
          ),
          linkBillingReport: [],
          contractors: [],
        })),
      );
    },
  };
}
