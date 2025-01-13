import { costQueryUtils } from "@/api/cost/cost.api.ts";
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
import { ClientBreadcrumbLink } from "@/features/_common/ClientBreadcrumbLink.tsx";
import { ClientWidget } from "@/features/_common/ClientView.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { CostInfo } from "@/features/_common/info/CostInfo.tsx";
import { ContractorPicker } from "@/features/_common/inline-search/ContractorPicker.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { ColumnDefinition, ListView } from "@/features/_common/ListView.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import {
  Summary,
  SummaryEntry,
  SummaryEntryValue,
} from "@/features/_common/Summary.tsx";
import { TruncatedMultilineText } from "@/features/_common/TruncatedMultilineText.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/WorkspaceBreadcrumbLink.tsx";
import { WorkspaceView } from "@/features/_common/WorkspaceView.tsx";
import { NewCostWidget } from "@/features/costs/NewCostWidget.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  CostEntry,
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
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { startCase } from "lodash";
import { Check, Loader2, PlusCircle } from "lucide-react";

export interface CostsWidgetProps
  extends WithServices<
    [
      WithReportDisplayService,
      WithFormatService,
      WithContractorService,
      WithClientService,
      WithWorkspaceService,
      WithPreferenceService,
      WithMutationService,
    ]
  > {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
}

export function CostsWidget(props: CostsWidgetProps) {
  const costs = props.services.reportDisplayService.useCostView(
    costQueryUtils.ofDefault(props.workspaceId, props.clientId),
  );

  const addCostState = promiseState.useRemoteData();

  const columns = useColumns(props);

  return (
    <CommonPageContainer
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <BreadcrumbPage>Costs</BreadcrumbPage>,
      ]}
      tools={
        <InlinePopoverForm
          trigger={
            <Button variant="default" size="sm" className="flex">
              {rd
                .fullJourney(addCostState.state)
                .initially(<PlusCircle />)
                .wait(<Loader2 />)
                .catch(renderSmallError("w-6 h-6"))
                .map(() => (
                  <Check />
                ))}
              Add cost
            </Button>
          }
          content={(bag) => (
            <>
              <PopoverHeader>Add new cost</PopoverHeader>
              <NewCostWidget
                onCancel={bag.close}
                defaultWorkspaceId={idSpecUtils.switchAll(
                  props.workspaceId,
                  undefined,
                )}
                defaultCurrency={rd.tryMap(
                  costs,
                  (reports) =>
                    reports.entries[reports.entries.length - 1]?.netAmount
                      .currency,
                )}
                defaultInvoiceDate={new Date()}
                services={props.services}
                onSubmit={(data) =>
                  addCostState.track(
                    props.services.mutationService
                      .createCost(data)
                      .then(bag.close),
                  )
                }
              />
            </>
          )}
        />
      }
    >
      <ListView
        data={rd.map(costs, (x) => x.entries)}
        columns={columns}
        caption={
          <>
            <div className="mb-2 font-semibold text-gray-700">
              A list of all costs associated with the selected workspace.
            </div>
            <h3 className="my-3 text-base font-semibold">Summary</h3>
            {rd.mapOrElse(
              costs,
              (view) => {
                const billingDetails = [
                  { label: "Net total", value: view.total.netAmount },
                  // { label: "Charged gross", value: view.total.grossAmount },
                  { label: "Total matched", value: view.total.matchedAmount },
                  {
                    label: "Total remaining",
                    value: view.total.remainingAmount,
                  },
                ];

                return (
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
                );
              },
              <div className="grid grid-flow-col gap-3">
                <Skeleton className="w-full h-10" />
                <Skeleton className="w-full h-10" />
                <Skeleton className="w-full h-10" />
              </div>,
            )}
          </>
        }
      />
    </CommonPageContainer>
  );
}

function useColumns(props: CostsWidgetProps): ColumnDefinition<CostEntry>[] {
  return [
    {
      label: "Id",
      cellRenderer: (cost) => cost.id,
    },
    {
      label: "Workspace",
      cellRenderer: (cost) => (
        <WorkspaceView layout="avatar" workspace={rd.of(cost.workspace)} />
      ),
    },
    {
      label: "Counterparty",
      cellRenderer: (cost) =>
        cost.contractor ? (
          <ContractorPicker
            value={cost.contractor.id}
            onSelect={null}
            services={props.services}
            size="xs"
          />
        ) : (
          cost.counterparty || "N/A"
        ),
    },
    {
      label: "Invoice Number",
      cellRenderer: (cost) => cost.invoiceNumber || "N/A",
    },
    {
      label: "Invoice Date",
      cellRenderer: (cost) =>
        props.services.formatService.temporal.date(cost.invoiceDate),
    },
    {
      label: "Net Value",
      cellRenderer: (cost) =>
        props.services.formatService.financial.currency(cost.netAmount),
    },
    {
      label: "Gross Value",
      cellRenderer: (cost) =>
        cost.grossAmount
          ? props.services.formatService.financial.currency(cost.grossAmount)
          : "N/A",
    },
    {
      label: "Status",
      cellRenderer: (cost) => (
        <Popover>
          <PopoverTrigger>
            <Badge
              variant={
                (
                  {
                    matched: "positive",
                    unmatched: "destructive",
                    "partially-matched": "warning",
                  } as const
                )[cost.status]
              }
            >
              {startCase(cost.status)}
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-fit">
            <PopoverHeader>Cost details</PopoverHeader>
            <CostInfo
              costEntry={cost}
              services={props.services}
              clientId={props.clientId}
              workspaceId={props.workspaceId}
            />
          </PopoverContent>
        </Popover>
      ),
    },
    {
      label: "Matched",
      cellRenderer: (cost) => (
        <div className="empty:hidden flex flex-row gap-1.5 items-center">
          {props.services.formatService.financial.currency(cost.matchedAmount)}
          {cost.linkReports.map((link) => (
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
    },
    {
      label: "Remaining",
      cellRenderer: (cost) =>
        props.services.formatService.financial.currency(cost.remainingAmount),
    },
    {
      label: "Description",
      cellRenderer: (cost) => (
        <TruncatedMultilineText>{cost.description}</TruncatedMultilineText>
      ),
    },
  ];
}
