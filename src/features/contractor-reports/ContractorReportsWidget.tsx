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
import { ClientBreadcrumbLink } from "@/features/_common/ClientBreadcrumbLink.tsx";
import { ClientWidget } from "@/features/_common/ClientView.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ContractorReportCostInfo } from "@/features/_common/info/ContractorReportCostInfo.tsx";
import { ContractorReportInfo } from "@/features/_common/info/ContractorReportInfo.tsx";
import { ContractorPicker } from "@/features/_common/inline-search/ContractorPicker.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import {
  Summary,
  SummaryEntry,
  SummaryEntryValue,
} from "@/features/_common/Summary.tsx";
import { TruncatedMultilineText } from "@/features/_common/TruncatedMultilineText.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/WorkspaceBreadcrumbLink.tsx";
import { WorkspaceView } from "@/features/_common/WorkspaceView.tsx";
import { headers } from "@/features/contractor-reports/headers.tsx";
import { NewContractorReportWidget } from "@/features/contractor-reports/NewContractorReportWidget.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ContractorReportViewEntry,
  WithReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
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
import { createColumnHelper } from "@tanstack/react-table";
import { addDays } from "date-fns";
import { chain, partialRight, startCase } from "lodash";
import { Check, Loader2, PlusCircle } from "lucide-react";
import { useState } from "react";

type ContractorReportsWidgetProps = {
  clientId: ClientSpec;
  workspaceId: WorkspaceSpec;
} & WithServices<
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
>;

export function ContractorReportsWidget(props: ContractorReportsWidgetProps) {
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

  const columns = useColumns(props);

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
                  onCancel={bag.close}
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
      <ListView
        data={rd.map(reports, (r) => r.entries)}
        columns={columns}
        caption={
          <>
            A list of all reported work for given client, matched with billing
            or clarifications.
            {rd.tryMap(reports, (view) => {
              const billingDetails = [
                { label: "Reported", value: view.total.netAmount },
                { label: "Charged", value: view.total.chargedAmount },
                { label: "Reconciled", value: view.total.reconciledAmount },
                { label: "To charge", value: view.total.toChargeAmount },
                { label: "Compensated", value: view.total.compensatedAmount },
                {
                  label: "To compensate",
                  value: view.total.toCompensateAmount,
                },
              ];

              return (
                <>
                  <h3 className="my-3 text-base font-semibold ">Summary</h3>
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
                </>
              );
            })}
          </>
        }
      />
    </CommonPageContainer>
  );
}

const columnHelper = createColumnHelper<ContractorReportViewEntry>();

function useColumns(props: ContractorReportsWidgetProps) {
  return [
    columnHelper.accessor("workspace", {
      header: "Issuer",

      cell: (info) => (
        <WorkspaceView layout="avatar" workspace={rd.of(info.getValue())} />
      ),
    }),
    columnHelper.accessor("contractor.fullName", { header: "Contractor" }),
    columnHelper.accessor("clientId", {
      header: "Client",
      cell: (info) => (
        <ClientWidget
          layout="avatar"
          size="xs"
          clientId={info.getValue()}
          services={props.services}
        />
      ),
    }),
    columnHelper.accessor("status", {
      header: "Charge Status",
      meta: {
        tooltip: headers.chargeStatus,
      },
      cell: (info) => (
        <Popover>
          <PopoverTrigger>
            <Badge
              variant={
                (
                  {
                    billed: "positive",
                    "partially-billed": "warning",
                    uncovered: "destructive",
                    clarified: "secondary",
                  } as const
                )[info.getValue()]
              }
            >
              {startCase(info.getValue())}
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-fit">
            <PopoverHeader>Report details</PopoverHeader>
            <ContractorReportInfo
              report={info.row.original}
              services={props.services}
            />
          </PopoverContent>
        </Popover>
      ),
    }),
    columnHelper.accessor("compensationStatus", {
      header: "Compensation",
      meta: {
        tooltip: headers.compensationStatus,
      },
      cell: (info) => (
        <Popover>
          <PopoverTrigger>
            <Badge
              tone="secondary"
              className="border border-slate-950/20"
              variant={
                (
                  {
                    compensated: "positive",
                    "partially-compensated": "warning",
                    uncompensated: "destructive",
                  } as const
                )[info.getValue()]
              }
            >
              {
                (
                  {
                    compensated: "Paid",
                    "partially-compensated": "Partially",
                    uncompensated: "Unpaid",
                  } as const
                )[info.getValue()]
              }
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-fit">
            <PopoverHeader>Compensation details</PopoverHeader>
            <ContractorReportCostInfo
              report={info.row.original}
              services={props.services}
            />
          </PopoverContent>
        </Popover>
      ),
    }),
    columnHelper.accessor("fullCompensationStatus", {
      header: "Full Comp.",
      meta: {
        tooltip: headers.fullCompensationStatus,
      },
      cell: (info) => (
        <Popover>
          <PopoverTrigger>
            <Badge
              tone="outline"
              variant={
                (
                  {
                    compensated: "positive",
                    "partially-compensated": "warning",
                    uncompensated: "destructive",
                  } as const
                )[info.getValue()]
              }
            >
              {
                (
                  {
                    compensated: "Compensated",
                    "partially-compensated": "Partially",
                    uncompensated: "Unpaid",
                  } as const
                )[info.getValue()]
              }
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-fit">
            <PopoverHeader>Compensation details</PopoverHeader>
            <ContractorReportCostInfo
              report={info.row.original}
              services={props.services}
            />
          </PopoverContent>
        </Popover>
      ),
    }),
    columnHelper.accessor("netAmount", {
      header: "Net Amount",
      cell: (info) =>
        props.services.formatService.financial.currency(info.getValue()),
      meta: {
        headerClassName: "bg-sky-50 border-x border-slate-800/10",
        cellClassName: "bg-sky-50/50 border-x border-slate-800/10",
      },
    }),
    columnHelper.group({
      header: "Charging",
      columns: [
        columnHelper.accessor("billedAmount", {
          header: "Amount",
          cell: (info) =>
            props.services.formatService.financial.currency(info.getValue()),
          meta: {
            headerClassName: "bg-rose-50 border-x border-slate-800/10",
            cellClassName: "bg-rose-50/50 border-x border-slate-800/10",
          },
        }),
        columnHelper.accessor("remainingAmount", {
          header: "Remaining",
          cell: (info) =>
            props.services.formatService.financial.currency(info.getValue()),
          meta: {
            headerClassName: "bg-rose-50 border-x border-slate-800/10",
            cellClassName: "bg-rose-50/50 border-x border-slate-800/10",
          },
        }),
      ],
      meta: {
        headerClassName: "bg-rose-50 border-x border-slate-800/10",
        cellClassName: "bg-rose-50/50 border-x border-slate-800/10",
      },
    }),
    columnHelper.group({
      header: "Compensation",
      columns: [
        columnHelper.accessor("compensatedAmount", {
          header: "Amount",
          cell: (info) =>
            props.services.formatService.financial.currency(info.getValue()),
          meta: {
            headerClassName: "bg-lime-50 border-x border-slate-800/10",
            cellClassName: "bg-lime-50/50 border-x border-slate-800/10",
            tooltip: headers.amount,
          },
        }),
        columnHelper.accessor("remainingCompensationAmount", {
          header: "To pay",
          cell: (info) =>
            props.services.formatService.financial.currency(info.getValue()),
          meta: {
            headerClassName: "bg-lime-50 border-x border-slate-800/10",
            cellClassName: "bg-lime-50/50 border-x border-slate-800/10",
            tooltip: headers.toPay,
          },
        }),
        columnHelper.accessor("remainingFullCompensationAmount", {
          header: "To comp.",
          cell: (info) =>
            props.services.formatService.financial.currency(info.getValue()),
          meta: {
            headerClassName: "bg-lime-50 border-x border-slate-800/10",
            cellClassName: "bg-lime-50/50 border-x border-slate-800/10",
            tooltip: headers.toCompensate,
          },
        }),
      ],
      meta: {
        headerClassName: "bg-lime-50 border-x border-slate-800/10",
        cellClassName: "bg-lime-50/50 border-x border-slate-800/10",
      },
    }),
    columnHelper.accessor("periodStart", {
      header: "Period",
      cell: (info) =>
        `${props.services.formatService.temporal.date(
          info.getValue(),
        )} - ${props.services.formatService.temporal.date(
          info.row.original.periodEnd,
        )}`,
    }),
    columnHelper.accessor("description", {
      header: "Description",
      cell: (info) => (
        <TruncatedMultilineText>{info.getValue()}</TruncatedMultilineText>
      ),
    }),
  ];
}
