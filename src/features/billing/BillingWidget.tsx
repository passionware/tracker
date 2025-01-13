import { clientBillingQueryUtils } from "@/api/client-billing/client-billing.api.ts";
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
import { ChargeInfo } from "@/features/_common/info/ChargeInfo.tsx";
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
import { NewClientBillingWidget } from "@/features/billing/NewClientBillingWidget.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ClientBillingViewEntry,
  WithReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { createColumnHelper } from "@tanstack/react-table";
import { Check, Loader2, PlusCircle } from "lucide-react";

type BillingWidgetProps = {
  clientId: ClientSpec;
  workspaceId: WorkspaceSpec;
} & WithServices<
  [
    WithReportDisplayService,
    WithFormatService,
    WithClientService,
    WithMutationService /*todo use auth flow*/,
    WithPreferenceService,
    WithWorkspaceService,
  ]
>;

export function BillingWidget(props: BillingWidgetProps) {
  const billings = props.services.reportDisplayService.useBillingView(
    clientBillingQueryUtils.ofDefault(props.workspaceId, props.clientId),
  );

  const addBillingState = promiseState.useRemoteData();
  const columns = useColumns(props);

  return (
    <CommonPageContainer
      tools={
        <>
          <InlinePopoverForm
            trigger={
              <Button variant="default" size="sm" className="flex">
                {rd
                  .fullJourney(addBillingState.state)
                  .initially(<PlusCircle />)
                  .wait(<Loader2 />)
                  .catch(renderSmallError("w-6 h-6"))
                  .map(() => (
                    <Check />
                  ))}
                Add client billing
              </Button>
            }
            content={(bag) => (
              <>
                <PopoverHeader>Add new billing</PopoverHeader>
                <NewClientBillingWidget
                  onCancel={bag.close}
                  defaultWorkspaceId={idSpecUtils.switchAll(
                    props.workspaceId,
                    undefined,
                  )}
                  defaultCurrency={rd.tryMap(
                    billings,
                    (reports) =>
                      reports.entries[reports.entries.length - 1]?.netAmount
                        .currency,
                  )}
                  defaultInvoiceDate={new Date()}
                  defaultClientId={idSpecUtils.switchAll(
                    props.clientId,
                    undefined,
                  )}
                  services={props.services}
                  onSubmit={(data) =>
                    addBillingState.track(
                      props.services.mutationService
                        .createClientBilling(data)
                        .then(bag.close),
                    )
                  }
                />
              </>
            )}
          />
        </>
      }
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <BreadcrumbPage>Client Invoices</BreadcrumbPage>,
      ]}
    >
      <ListView
        data={rd.map(billings, (x) => x.entries)}
        columns={columns}
        caption={
          <>
            <div className="mb-2 font-semibold text-gray-700">
              A list of all billings for the selected client.
            </div>
            {rd.tryMap(billings, (view) => {
              const billingDetails = [
                { label: "Charged", value: view.total.netAmount },
                // { label: "Charged gross", value: view.total.grossAmount },
                { label: "Reconciled", value: view.total.matchedAmount },
                { label: "To reconcile", value: view.total.remainingAmount },
              ];

              return (
                <div>
                  <h3 className="my-3 text-base font-semibold text-gray-900">
                    Summary
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
          </>
        }
      />
    </CommonPageContainer>
  );
}

const columnHelper = createColumnHelper<ClientBillingViewEntry>();
function useColumns(props: BillingWidgetProps) {
  return [
    columnHelper.accessor("id", {
      header: "Id",
      cell: (info) => <div className="font-medium">{info.getValue()}</div>,
    }),
    columnHelper.accessor("workspace", {
      header: "Issuer",
      cell: (info) => (
        <WorkspaceView layout="avatar" workspace={rd.of(info.getValue())} />
      ),
    }),
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
    columnHelper.accessor("invoiceNumber", {
      header: "Invoice Number",
    }),
    columnHelper.accessor("invoiceDate", {
      header: "Invoice Date",
      cell: (info) =>
        props.services.formatService.temporal.date(info.getValue()),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => (
        <Popover>
          <PopoverTrigger>
            <Badge
              tone="solid"
              variant={
                (
                  {
                    matched: "positive",
                    unmatched: "destructive",
                    "partially-matched": "warning",
                    clarified: "secondary",
                  } as const
                )[info.getValue()]
              }
            >
              {
                (
                  {
                    matched: "Matched",
                    unmatched: "Unmatched",
                    "partially-matched": "Partially Matched",
                    clarified: "Clarified",
                  } as const
                )[info.getValue()]
              }
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-fit">
            <PopoverHeader>Invoice details</PopoverHeader>
            <ChargeInfo services={props.services} billing={info.row.original} />
          </PopoverContent>
        </Popover>
      ),
    }),
    columnHelper.accessor("netAmount", {
      header: "Net Amount",
      cell: (info) =>
        props.services.formatService.financial.amount(
          info.getValue().amount,
          info.getValue().currency,
        ),
    }),
    columnHelper.accessor("grossAmount", {
      header: "Gross Amount",
      cell: (info) =>
        props.services.formatService.financial.amount(
          info.getValue().amount,
          info.getValue().currency,
        ),
    }),
    columnHelper.accessor("matchedAmount", {
      header: "Matched Amount",
      cell: (info) => (
        <div className="empty:hidden flex flex-row gap-1.5 items-center">
          {props.services.formatService.financial.amount(
            info.getValue().amount,
            info.getValue().currency,
          )}
          {info.row.original.links
            .filter((l) => l.type === "reconcile")
            .map((link) => (
              <ClientWidget
                layout="avatar"
                size="xs"
                key={link.id}
                clientId={link.contractorReport.clientId}
                services={props.services}
              />
            ))}
        </div>
      ),
    }),
    columnHelper.accessor("remainingAmount", {
      header: "Remaining Amount",
      cell: (info) =>
        props.services.formatService.financial.amount(
          info.getValue().amount,
          info.getValue().currency,
        ),
    }),
    columnHelper.accessor("description", {
      header: "Description",
      cell: (info) => (
        <TruncatedMultilineText>{info.getValue()}</TruncatedMultilineText>
      ),
    }),
  ];
}
