import { clientBillingQueryUtils } from "@/api/client-billing/client-billing.api.ts";
import { Client } from "@/api/clients/clients.api.ts";
import { contractorReportQueryUtils } from "@/api/contractor-reports/contractor-reports.api.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";
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
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/ClientBreadcrumbLink.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { DeleteButtonWidget } from "@/features/_common/DeleteButtonWidget.tsx";
import { ContractorPicker } from "@/features/_common/inline-search/ContractorPicker.tsx";
import { InlineBillingClarify } from "@/features/_common/inline-search/InlineBillingClarify.tsx";
import { InlineBillingSearch } from "@/features/_common/inline-search/InlineClientBillingSearch.tsx";
import { OpenState } from "@/features/_common/OpenState.tsx";
import {
  renderError,
  renderSmallError,
} from "@/features/_common/renderError.tsx";
import { WorkspaceView } from "@/features/_common/WorkspaceView.tsx";
import { NewContractorReportWidget } from "@/features/contractor-reports/NewContractorReportWidget.tsx";
import { cn } from "@/lib/utils.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, Maybe, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { addDays } from "date-fns";
import { partial, partialRight } from "lodash";
import { Check, Info, Link2, Loader2, PlusCircle } from "lucide-react";
import { useState } from "react";

export function ContractorReportsWidget(
  props: { clientId: Client["id"] } & WithServices<
    [
      WithReportDisplayService,
      WithFormatService,
      WithClientService,
      WithMutationService,
      WithContractorService,
      WithWorkspaceService,
      WithPreferenceService,
    ]
  >,
) {
  const [contractorFilter, setContractorFilter] = useState<
    Maybe<Contractor["id"]>
  >(maybe.ofAbsent());
  const reports = props.services.reportDisplayService.useReportView(
    contractorReportQueryUtils.setFilter(
      contractorReportQueryUtils.setFilter(
        contractorReportQueryUtils.ofDefault(),
        "clientId",
        { operator: "oneOf", value: [props.clientId] },
      ),
      "contractorId",
      maybe.map(contractorFilter, (x) => ({ operator: "oneOf", value: [x] })),
    ),
  );

  const linkingState = promiseState.useRemoteData();
  const clarifyState = promiseState.useRemoteData();
  const addReportState = promiseState.useRemoteData();

  return (
    <CommonPageContainer
      segments={[
        <ClientBreadcrumbLink {...props} />,
        <BreadcrumbPage>Reported work</BreadcrumbPage>,
      ]}
      tools={
        <>
          <div className="rounded-md border border-slate-300 bg-slate-50 p-2 w-fit flex flex-row gap-1 items-center text-xs text-slate-600">
            Filters:
            <ContractorPicker
              allowClear
              size="xs"
              value={contractorFilter}
              onSelect={setContractorFilter}
              services={props.services}
            />
          </div>
          <OpenState>
            {(bag) => (
              <Popover {...bag}>
                <PopoverTrigger asChild>
                  <Button variant="default" size="sm" className="flex">
                    {rd
                      .fullJourney(addReportState.state)
                      .initially(<PlusCircle />)
                      .wait(<Loader2 />)
                      .catch(renderSmallError("w-6 h-6"))
                      .map(() => (
                        <Check />
                      ))}
                    Add report
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-fit">
                  <PopoverHeader>Add new contractor report</PopoverHeader>
                  <NewContractorReportWidget
                    defaultCurrency={rd.tryMap(
                      reports,
                      (reports) =>
                        reports.entries[reports.entries.length - 1]?.netAmount
                          .currency,
                    )}
                    defaultContractorId={rd.tryMap(
                      reports,
                      (reports) =>
                        reports.entries[reports.entries.length - 1]?.contractor
                          .id,
                    )}
                    defaultPeriodStart={rd.tryMap(reports, (reports) =>
                      maybe.map(
                        reports.entries[reports.entries.length - 1]?.periodEnd,
                        partialRight(addDays, 1),
                      ),
                    )}
                    defaultPeriodEnd={new Date()}
                    defaultClientId={props.clientId}
                    services={props.services}
                    onSubmit={(data) =>
                      addReportState.track(
                        props.services.mutationService
                          .createContractorReport(data)
                          .then(bag.close),
                      )
                    }
                  />
                </PopoverContent>
              </Popover>
            )}
          </OpenState>
        </>
      }
    >
      <Table>
        <TableCaption className="text-sm text-gray-500 text-left bg-gray-50 p-4 rounded-md">
          A list of all reported work for given client, matched with billing or
          clarifications.
          {rd.tryMap(reports, (view) => {
            const billingDetails = [
              { label: "Reported", value: view.total.netAmount },
              { label: "Charged", value: view.total.chargedAmount },
              { label: "Reconciled", value: view.total.reconciledAmount },
              { label: "To charge", value: view.total.toChargeAmount },
            ];

            return (
              <div>
                <h3 className="my-3 text-base font-semibold text-gray-900">
                  Sumary
                </h3>
                <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-4">
                  {billingDetails.map((item) => (
                    <div
                      key={item.label}
                      className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6"
                    >
                      <dt className="truncate text-sm font-medium text-gray-500">
                        {item.label}
                      </dt>
                      <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                        {maybe.mapOrElse(
                          item.value,
                          props.services.formatService.financial.currency,
                          "-",
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="">Id</TableHead>
            <TableHead>Issuer</TableHead>
            <TableHead>Contractor</TableHead>
            <SimpleTooltip
              title={
                <div className="space-y-4">
                  <PopoverHeader>Charge status</PopoverHeader>
                  <div>
                    <Badge variant="positive">Billed</Badge> - We charged the
                    client for the entire work value reported by the contractor
                  </div>
                  <div>
                    <Badge variant="warning">Partially billed</Badge> - We
                    charged the client for some work, but there is still some
                    work we should charge the client for.
                  </div>
                  <div>
                    <Badge variant="destructive">Uncovered</Badge> - We did not
                    charge the client for any work reported by the contractor
                    yet.
                  </div>
                  <div>
                    <Badge variant="secondary">Clarified</Badge> - We charged
                    for some work, and for the rest of work we didn't charge the
                    client, but we clarified the difference, no more charges due
                    to this report is expected.
                  </div>
                </div>
              }
            >
              <TableHead className="whitespace-pre">
                Charge Status <Info className="inline size-4" />
              </TableHead>
            </SimpleTooltip>
            <TableHead>Compensation&nbsp;Status</TableHead>
            <TableHead>Full&nbsp;Compensation</TableHead>
            <TableHead>Net value</TableHead>
            <TableHead>Charged&nbsp;value</TableHead>
            <TableHead>To&nbsp;charge</TableHead>
            <TableHead>To&nbsp;refund&nbsp;now</TableHead>
            <TableHead>To&nbsp;refund&nbsp;later</TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rd
            .journey(reports)
            .wait(
              <TableRow>
                {Array.from({ length: 11 }).map((_, i) => (
                  <TableCell key={i}>
                    <Skeleton className="w-32 h-6" />
                  </TableCell>
                ))}
              </TableRow>,
            )
            .catch(renderError)
            .map((reports) => {
              if (reports.entries.length === 0) {
                return (
                  <TableRow>
                    <TableCell colSpan={11}>
                      No contractor reports found.
                    </TableCell>
                  </TableRow>
                );
              }
              return reports.entries.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.id}</TableCell>
                  <TableCell>
                    <WorkspaceView
                      layout="avatar"
                      workspace={report.workspace}
                    />
                  </TableCell>
                  <TableCell className="text-xs">
                    {report.contractor.fullName}
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger>
                        <Badge
                          tone="solid"
                          variant={
                            (
                              {
                                billed: "positive",
                                "partially-billed": "warning",
                                uncovered: "destructive",
                                clarified: "secondary",
                              } as const
                            )[report.status]
                          }
                        >
                          {
                            {
                              billed: "Billed",
                              "partially-billed": "Partially billed",
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
                            <div
                              className="flex items-center gap-2"
                              key={link.id}
                            >
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
                              <div className="text-sm font-medium leading-none flex flex-row gap-2">
                                {props.services.formatService.financial.amount(
                                  link.amount.amount,
                                  link.amount.currency,
                                )}
                                {link.linkType === "clientBilling" && (
                                  <div className="contents text-gray-500">
                                    of
                                    {props.services.formatService.financial.amount(
                                      link.billing.totalNet,
                                      link.billing.currency,
                                    )}
                                  </div>
                                )}
                              </div>
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
                                      <div className="text-xs text-gray-900">
                                        {link.justification}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>
                              <DeleteButtonWidget
                                services={props.services}
                                onDelete={partial(
                                  props.services.mutationService
                                    .deleteBillingReportLink,
                                  link.id,
                                )}
                              />
                            </div>
                          ))}
                          {report.remainingAmount.amount > 0 && (
                            <div className="flex gap-2 flex-row">
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
                                            type: "reconcile",
                                            contractorReportId: report.id,
                                            clientBillingId: data.billingId,
                                            linkAmount: data.value,
                                          },
                                        ),
                                      )
                                    }
                                    query={clientBillingQueryUtils.setFilter(
                                      clientBillingQueryUtils.setFilter(
                                        clientBillingQueryUtils.ofDefault(),
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
                                  <InlineBillingClarify
                                    maxAmount={report.remainingAmount.amount}
                                    services={props.services}
                                    onSelect={(data) =>
                                      clarifyState.track(
                                        props.services.mutationService.linkReportAndBilling(
                                          data,
                                        ),
                                      )
                                    }
                                    context={{
                                      contractorReportId: report.id,
                                    }}
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
                    <Badge variant="secondary" size="md">
                      TODO
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" size="md">
                      TODO
                    </Badge>
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
                  <TableCell>-1</TableCell>
                  <TableCell>-1</TableCell>
                  <TableCell>
                    {props.services.formatService.temporal.date(
                      report.periodStart,
                    )}{" "}
                    -{" "}
                    {props.services.formatService.temporal.date(
                      report.periodEnd,
                    )}
                  </TableCell>
                  <TableCell className="text-left">
                    <SimpleTooltip title={report.description}>
                      <div className="line-clamp-6 overflow-hidden text-ellipsis break-all text-[8pt] leading-3 text-slate-800">
                        {report.description}
                      </div>
                    </SimpleTooltip>
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
