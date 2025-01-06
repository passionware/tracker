import { clientBillingQueryUtils } from "@/api/client-billing/client-billing.api.ts";
import { Client } from "@/api/clients/clients.api.ts";
import { contractorReportQueryUtils } from "@/api/contractor-reports/contractor-reports.api.ts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
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
import { InlineClientBillingClarify } from "@/features/_common/inline-search/InlineClientBillingClarify.tsx";
import { InlineBillingSearch } from "@/features/_common/inline-search/InlineClientBillingSearch.tsx";
import {
  renderError,
  renderSmallError,
} from "@/features/_common/renderError.tsx";
import { cn } from "@/lib/utils.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Check, Link2, Loader2, PlusCircle } from "lucide-react";

export function ContractorReportsWidget(
  props: { clientId: Client["id"] } & WithServices<
    [
      WithReportDisplayService,
      WithFormatService,
      WithClientService,
      WithMutationService,
    ]
  >,
) {
  const reports = props.services.reportDisplayService.useReportView(
    contractorReportQueryUtils.setFilter(
      contractorReportQueryUtils.ofEmpty(),
      "clientId",
      { operator: "oneOf", value: [props.clientId] },
    ),
  );

  const linkingState = promiseState.useRemoteData();
  const clarifyState = promiseState.useRemoteData();

  return (
    <CommonPageContainer
      segments={[
        <ClientBreadcrumbLink {...props} />,
        <BreadcrumbPage>Reported work</BreadcrumbPage>,
      ]}
      tools={
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="default" size="sm">
              <PlusCircle />
              Add report
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-fit">
            <div>Coming soon</div>
            {/* TODO

             * closable popover - with child as render function that returns api to close popover
             * new report widget - with form
             
             */}
          </PopoverContent>
        </Popover>
      }
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
            <TableHead>Remaining</TableHead>
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
                    <TableCell colSpan={4}>
                      No contractor reports found.
                    </TableCell>
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
                        <PopoverHeader>Report details</PopoverHeader>
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
                                      <PopoverHeader>
                                        Justification for unmatched amount
                                      </PopoverHeader>
                                      <div className="text-xs text-gray-900 whitespace-pre-line">
                                        {link.justification}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>
                            </div>
                          ))}
                          {report.remainingAmount.amount > 0 && (
                            <div className="space-x-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="default" size="xs">
                                    {rd
                                      .fullJourney(linkingState.state)
                                      .initially(<Link2 />)
                                      .wait(<Loader2 />)
                                      .catch(renderSmallError("w-6 h-4"))
                                      .map(() => (
                                        <Check />
                                      ))}
                                    Find & link billing
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-fit">
                                  <InlineBillingSearch
                                    maxAmount={report.remainingAmount.amount}
                                    services={props.services}
                                    onSelect={(data) =>
                                      linkingState.track(
                                        props.services.mutationService.linkReportAndBilling(
                                          {
                                            contractorReportId: report.id,
                                            clientBillingId: data.billingId,
                                            reconcileAmount: data.value,
                                          },
                                        ),
                                      )
                                    }
                                    query={clientBillingQueryUtils.setFilter(
                                      clientBillingQueryUtils.setFilter(
                                        clientBillingQueryUtils.ofEmpty(),
                                        "remainingAmount",
                                        { operator: "greaterThan", value: 0 },
                                      ),
                                      "clientId",
                                      {
                                        operator: "oneOf",
                                        value: [props.clientId],
                                      },
                                    )}
                                  />
                                </PopoverContent>
                              </Popover>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="warning" size="xs">
                                    {rd
                                      .fullJourney(clarifyState.state)
                                      .initially(<Link2 />)
                                      .wait(<Loader2 />)
                                      .catch(renderSmallError("w-6 h-4"))
                                      .map(() => (
                                        <Check />
                                      ))}
                                    Clarify
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-fit max-w-md"
                                  align="center"
                                  side="right"
                                >
                                  <InlineClientBillingClarify
                                    maxAmount={report.remainingAmount.amount}
                                    services={props.services}
                                    onSelect={(data) =>
                                      clarifyState.track(
                                        props.services.mutationService.clarifyLink(
                                          data,
                                        ),
                                      )
                                    }
                                    contractorReportId={report.id}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
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
                    {props.services.formatService.financial.amount(
                      report.remainingAmount.amount,
                      report.remainingAmount.currency,
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
