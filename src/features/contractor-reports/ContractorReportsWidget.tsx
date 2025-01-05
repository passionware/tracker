import { Client } from "@/api/clients/clients.api.ts";
import { contractorReportQueryUtils } from "@/api/contractor-reports/contractor-reports.api.ts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import {
  Popover,
  PopoverContent,
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
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { cn } from "@/lib/utils.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { rd } from "@passionware/monads";

export function ContractorReportsWidget(
  props: { clientId: Client["id"] } & WithServices<
    [WithReportDisplayService, WithFormatService]
  >,
) {
  const reports = props.services.reportDisplayService.useReportView(
    contractorReportQueryUtils.setFilter(
      contractorReportQueryUtils.ofEmpty(),
      "clientId",
      { operator: "oneOf", value: [props.clientId] },
    ),
  );
  return (
    <CommonPageContainer
      segments={[
        <BreadcrumbLink>Client</BreadcrumbLink>,
        <BreadcrumbPage>Reported work</BreadcrumbPage>,
      ]}
    >
      <Table>
        <TableCaption>
          A list of all reported work for given client, matched with billing or
          clarifications.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Id</TableHead>
            <TableHead>Contractor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Net value</TableHead>
            <TableHead>Billed value</TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rd
            .journey(reports)
            .wait(
              <TableRow>
                <TableCell>
                  <Skeleton className="w-32 h-6" />
                </TableCell>
                <TableCell>
                  <Skeleton className="w-32 h-6" />
                </TableCell>
                <TableCell>
                  <Skeleton className="w-32 h-6" />
                </TableCell>
                <TableCell>
                  <Skeleton className="w-32 h-6" />
                </TableCell>
                <TableCell>
                  <Skeleton className="w-32 h-6" />
                </TableCell>
                <TableCell>
                  <Skeleton className="w-32 h-6" />
                </TableCell>
                <TableCell>
                  <Skeleton className="w-32 h-6" />
                </TableCell>
              </TableRow>,
            )
            .catch(renderError)
            .map((reports) => {
              if (reports.length === 0) {
                return (
                  <TableRow>
                    <TableCell colSpan={4}>No invoices found.</TableCell>
                  </TableRow>
                );
              }
              return reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.id}</TableCell>
                  <TableCell>{report.contractor.fullName}</TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger>
                        <Badge
                          tone="solid"
                          variant={
                            (
                              {
                                billed: "positive",
                                uncovered: "destructive",
                                clarified: "secondary",
                              } as const
                            )[report.status]
                          }
                        >
                          {
                            {
                              billed: "Billed",
                              uncovered: "Uncovered",
                              clarified: "Clarified",
                            }[report.status]
                          }
                        </Badge>
                      </PopoverTrigger>
                      <PopoverContent className="w-fit">
                        <div className="flex justify-between">
                          <div className="text-green-700 flex flex-col gap-2 items-start">
                            <Badge tone="outline" variant="positive">
                              Reconciled
                            </Badge>{" "}
                            {props.services.formatService.financial.amount(
                              report.reconciledAmount.amount,
                              report.reconciledAmount.currency,
                            )}
                          </div>
                          <div
                            className={cn(
                              "flex flex-col gap-2 items-end",
                              report.remainingAmount.amount === 0
                                ? "text-gray-800"
                                : "text-red-800",
                            )}
                          >
                            <Badge tone="outline" variant="destructive">
                              Remaining
                            </Badge>{" "}
                            {props.services.formatService.financial.amount(
                              report.remainingAmount.amount,
                              report.remainingAmount.currency,
                            )}
                          </div>
                        </div>
                        <Separator className="my-2" />
                        <div className="text-sm text-gray-700 font-medium my-1 text-center">
                          Linked invoices or clarifications
                        </div>
                        <Separator className="my-2" />
                        <div className="space-y-8">
                          {report.links.map((link) => (
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  (
                                    {
                                      clientBilling: "positive",
                                      clarification: "warning",
                                    } as const
                                  )[link.linkType]
                                }
                                className=""
                              >
                                {
                                  {
                                    clientBilling: "Client billing",
                                    clarification: "Clarification",
                                  }[link.linkType]
                                }
                              </Badge>
                              <p className="text-sm font-medium leading-none">
                                {props.services.formatService.financial.amount(
                                  link.amount.amount,
                                  link.amount.currency,
                                )}
                              </p>
                              <div className="ml-auto font-medium text-sm flex flex-col items-end gap-1">
                                {link.linkType === "clientBilling" && (
                                  <>
                                    <div className="text-gray-600 text-xs mr-1.5">
                                      {link.billing.invoiceNumber}
                                    </div>
                                    <Badge variant="secondary" size="sm">
                                      {props.services.formatService.temporal.date(
                                        link.billing.invoiceDate,
                                      )}
                                    </Badge>
                                  </>
                                )}
                                {link.linkType === "clarification" && (
                                  <Popover>
                                    <PopoverTrigger>
                                      <Badge size="sm" variant="secondary">
                                        Justification
                                      </Badge>
                                    </PopoverTrigger>
                                    <PopoverContent
                                      align="end"
                                      side="right"
                                      className="max-w-lg w-fit"
                                    >
                                      <div>
                                        Justification for unmatched amount
                                      </div>
                                      <div className="text-xs text-gray-900">
                                        {link.justification}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <Alert variant="info" className="mt-4">
                          <AlertTitle>
                            If remaining amount is greater than 0, it may mean:
                          </AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside text-left">
                              <li>We didn't link report to existing invoice</li>
                              <li>We forgot to invoice the client</li>
                              <li>
                                We didn't clarify the difference, like discount
                              </li>
                            </ul>
                          </AlertDescription>
                        </Alert>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell>
                    {props.services.formatService.financial.amount(
                      report.netAmount.amount,
                      report.netAmount.currency,
                    )}
                  </TableCell>
                  <TableCell>
                    {props.services.formatService.financial.amount(
                      report.billedAmount.amount,
                      report.billedAmount.currency,
                    )}
                  </TableCell>
                  <TableCell>
                    {props.services.formatService.temporal.date(
                      report.periodStart,
                    )}{" "}
                    -{" "}
                    {props.services.formatService.temporal.date(
                      report.periodEnd,
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {report.description}
                  </TableCell>
                </TableRow>
              ));
            })}
        </TableBody>
        {/*<TableFooter>*/}
        {/*  <TableRow>*/}
        {/*    <TableCell colSpan={5}>Total</TableCell>*/}
        {/*    <TableCell className="text-right">$2,500.00</TableCell>*/}
        {/*  </TableRow>*/}
        {/*</TableFooter>*/}
      </Table>
    </CommonPageContainer>
  );
}
