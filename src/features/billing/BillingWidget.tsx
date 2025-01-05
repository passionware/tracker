import { billingQueryUtils } from "@/api/client-billing/client-billing.api.ts";
import { Client } from "@/api/clients/clients.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/ClientBreadcrumbLink.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { rd } from "@passionware/monads";

export function BillingWidget(
  props: { clientId: Client["id"] } & WithServices<
    [WithReportDisplayService, WithFormatService, WithClientService]
  >,
) {
  const billings = props.services.reportDisplayService.useBillingView(
    billingQueryUtils.setFilter(billingQueryUtils.ofEmpty(), "clientId", {
      operator: "oneOf",
      value: [props.clientId],
    }),
  );

  return (
    <CommonPageContainer
      segments={[
        <ClientBreadcrumbLink {...props} />,
        <BreadcrumbPage>Client Billings</BreadcrumbPage>,
      ]}
    >
      <Table>
        <TableCaption>
          A list of all billings for the selected client.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Id</TableHead>
            <TableHead>Invoice Number</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Net Amount</TableHead>
            <TableHead>Gross Amount</TableHead>
            <TableHead>Matched Amount</TableHead>
            <TableHead>Remaining Amount</TableHead>
            <TableHead className="text-right">Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rd
            .journey(billings)
            .wait(
              <TableRow>
                {Array(8)
                  .fill(null)
                  .map((_, index) => (
                    <TableCell key={index}>
                      <Skeleton className="w-32 h-6" />
                    </TableCell>
                  ))}
              </TableRow>,
            )
            .catch(renderError)
            .map((billings) => {
              if (billings.length === 0) {
                return (
                  <TableRow>
                    <TableCell colSpan={8}>No billings found.</TableCell>
                  </TableRow>
                );
              }
              return billings.map((billing) => (
                <TableRow key={billing.id}>
                  <TableCell className="font-medium">{billing.id}</TableCell>
                  <TableCell>{billing.invoiceNumber}</TableCell>
                  <TableCell>
                    <Badge
                      tone="solid"
                      variant={
                        (
                          {
                            matched: "positive",
                            unmatched: "destructive",
                          } as const
                        )[billing.status]
                      }
                    >
                      {billing.status === "matched" ? "Matched" : "Unmatched"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {props.services.formatService.financial.amount(
                      billing.netAmount.amount,
                      billing.netAmount.currency,
                    )}
                  </TableCell>
                  <TableCell>
                    {props.services.formatService.financial.amount(
                      billing.grossAmount.amount,
                      billing.grossAmount.currency,
                    )}
                  </TableCell>
                  <TableCell>
                    {props.services.formatService.financial.amount(
                      billing.matchedAmount.amount,
                      billing.matchedAmount.currency,
                    )}
                  </TableCell>
                  <TableCell>
                    {props.services.formatService.financial.amount(
                      billing.remainingAmount.amount,
                      billing.remainingAmount.currency,
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {billing.description || "N/A"}
                  </TableCell>
                </TableRow>
              ));
            })}
        </TableBody>
      </Table>
    </CommonPageContainer>
  );
}
