import { contractorReportQueryUtils } from "@/api/contractor-reports/contractor-reports.api.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
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
import { ClientWidget } from "@/features/_common/ClientView.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ContractorReportInfo } from "@/features/_common/info/ContractorReportInfo.tsx";
import { ContractorPicker } from "@/features/_common/inline-search/ContractorPicker.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import {
  renderError,
  renderSmallError,
} from "@/features/_common/renderError.tsx";
import {
  Summary,
  SummaryEntry,
  SummaryEntryValue,
} from "@/features/_common/Summary.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/WorkspaceBreadcrumbLink.tsx";
import { WorkspaceView } from "@/features/_common/WorkspaceView.tsx";
import { NewContractorReportWidget } from "@/features/contractor-reports/NewContractorReportWidget.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, Maybe, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { addDays } from "date-fns";
import { chain, partialRight } from "lodash";
import { Check, Info, Loader2, PlusCircle } from "lucide-react";
import { useState } from "react";

export function ContractorReportsWidget(
  props: { clientId: ClientSpec; workspaceId: WorkspaceSpec } & WithServices<
    [
      WithReportDisplayService,
      WithFormatService,
      WithClientService,
      WithMutationService,
      WithContractorService,
      WithWorkspaceService,
      WithPreferenceService,
      WithWorkspaceService,
    ]
  >,
) {
  const [contractorFilter, setContractorFilter] = useState<
    Maybe<Contractor["id"]>
  >(maybe.ofAbsent());
  const reports = props.services.reportDisplayService.useReportView(
    chain(
      contractorReportQueryUtils.ofDefault(props.workspaceId, props.clientId),
    )
      .thru((x) =>
        contractorReportQueryUtils.setFilter(
          x,
          "contractorId",
          maybe.map(contractorFilter, (x) => ({
            operator: "oneOf",
            value: [x],
          })),
        ),
      )
      .value(),
  );

  const addReportState = promiseState.useRemoteData();

  return (
    <CommonPageContainer
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
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
          <InlinePopoverForm
            trigger={
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
            }
            content={(bag) => (
              <>
                <PopoverHeader>Add new contractor report</PopoverHeader>
                <NewContractorReportWidget
                  defaultWorkspaceId={idSpecUtils.switchAll(
                    props.workspaceId,
                    undefined,
                  )}
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
                  defaultClientId={idSpecUtils.switchAll(
                    props.clientId,
                    undefined,
                  )}
                  services={props.services}
                  onSubmit={(data) =>
                    addReportState.track(
                      props.services.mutationService
                        .createContractorReport(data)
                        .then(bag.close),
                    )
                  }
                />
              </>
            )}
          />
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
                <Summary>
                  {billingDetails.map((item) => (
                    <SummaryEntry key={item.label} label={item.label}>
                      {item.value.map((value, index) => (
                        <SummaryEntryValue key={index}>
                          {props.services.formatService.financial.currency(
                            value,
                          )}
                        </SummaryEntryValue>
                      ))}
                    </SummaryEntry>
                  ))}
                </Summary>
              </div>
            );
          })}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="">Id</TableHead>
            <TableHead>Issuer</TableHead>
            <TableHead>Contractor</TableHead>
            <TableHead>Client</TableHead>
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
                      workspace={rd.of(report.workspace)}
                    />
                  </TableCell>
                  <TableCell className="text-xs">
                    {report.contractor.fullName}
                  </TableCell>
                  <TableCell>
                    <ClientWidget
                      key={report.id}
                      layout="avatar"
                      size="xs"
                      clientId={report.clientId}
                      services={props.services}
                    />
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
                        <ContractorReportInfo
                          report={report}
                          clientId={props.clientId}
                          workspaceId={props.workspaceId}
                          services={props.services}
                        />
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
