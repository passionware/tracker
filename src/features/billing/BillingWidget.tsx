import { billingQueryUtils } from "@/api/client-billing/client-billing.api.ts";
import { Client } from "@/api/clients/clients.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Separator } from "@/components/ui/separator.tsx";
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
import { cn } from "@/lib/utils.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { rd } from "@passionware/monads";
import { Slot } from "@radix-ui/react-slot";

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
            <TableHead>Invoice Date</TableHead>
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
                {Array(9)
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
                    {props.services.formatService.temporal.date(
                      billing.invoiceDate,
                    )}
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger>
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
                          {billing.status === "matched"
                            ? "Matched"
                            : "Unmatched"}
                        </Badge>
                      </PopoverTrigger>
                      <PopoverContent className="w-fit">
                        <PopoverHeader>Invoice details</PopoverHeader>
                        <div className="flex justify-between">
                          <div className="text-green-700 flex flex-col gap-2 items-start">
                            <Badge tone="outline" variant="positive">
                              Matched Total
                            </Badge>
                            {props.services.formatService.financial.amount(
                              billing.matchedAmount.amount,
                              billing.matchedAmount.currency,
                            )}
                          </div>
                          <div
                            className={cn(
                              "flex flex-col gap-2 items-end",
                              billing.remainingAmount.amount === 0
                                ? "text-gray-800"
                                : "text-red-800",
                            )}
                          >
                            <Badge tone="outline" variant="destructive">
                              Remaining Total
                            </Badge>
                            {props.services.formatService.financial.amount(
                              billing.remainingAmount.amount,
                              billing.remainingAmount.currency,
                            )}
                          </div>
                        </div>
                        <Separator className="my-2" />
                        <div className="text-sm text-gray-700 font-medium my-1 text-center">
                          Linked Contractor Reports
                        </div>
                        <Separator className="my-2" />
                        <div className="space-y-8">
                          {billing.links.map((link) => (
                            <div
                              className="flex items-center gap-2"
                              key={link.id}
                            >
                              <div className="flex flex-col gap-3">
                                <div className="flex flex-row justify-between items-center gap-2">
                                  <Badge variant="positive">Report</Badge>
                                  <Badge variant="secondary" size="sm">
                                    {props.services.formatService.temporal.date(
                                      link.contractorReport.periodStart,
                                    )}
                                    -
                                    {props.services.formatService.temporal.date(
                                      link.contractorReport.periodEnd,
                                    )}
                                  </Badge>
                                </div>
                                <div className="text-sm font-medium leading-none shrink-0 w-fit flex flex-row gap-2">
                                  {props.services.formatService.financial.amount(
                                    link.amount.amount,
                                    link.amount.currency,
                                  )}
                                  <div className="text-gray-500">of</div>
                                  <Slot className="text-gray-500">
                                    {props.services.formatService.financial.amount(
                                      link.contractorReport.netValue,
                                      link.contractorReport.currency,
                                    )}
                                  </Slot>
                                </div>
                              </div>
                              <div className="text-gray-600 text-xs mr-1.5 max-w-64 border border-gray-300 rounded p-1 bg-gray-50">
                                {link.contractorReport.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
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
