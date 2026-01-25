import { Cost } from "@/api/cost/cost.api.ts";
import { reportQueryUtils } from "@/api/reports/reports.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns.tsx";
import { reportColumns } from "@/features/_common/columns/report.tsx";
import { InlineReportSearch } from "@/features/_common/elements/inline-search/InlineReportSearch.tsx";
import { LinkPopover } from "@/features/_common/filters/LinkPopover.tsx";
import {
  InfoLayout,
  InfoPopoverContent,
} from "@/features/_common/info/_common/InfoLayout.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { TransferView } from "@/features/_common/TransferView.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
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
import { rd, truthy } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { mapKeys } from "@passionware/platform-ts";
import { createColumnHelper } from "@tanstack/react-table";
import { Check, Link2, Loader2, Shuffle, Trash2 } from "lucide-react";
import { ReactElement } from "react";

export interface CostInfoProps
  extends WithServices<
    [
      WithFormatService,
      WithReportDisplayService,
      WithPreferenceService,
      WithMutationService,
      WithClientService,
      WithContractorService,
      WithWorkspaceService,
      WithExpressionService,
    ]
  > {
  costEntry: CostEntry;
  clientId: ClientSpec;
  workspaceId: WorkspaceSpec;
}

const columnHelper = createColumnHelper<Cost["linkReports"][number]>();

export function CostInfo({
  costEntry,
  services,
  clientId,
  workspaceId,
}: CostInfoProps) {
  const linkingState = promiseState.useRemoteData();

  const isDangerMode = services.preferenceService.useIsDangerMode();

  return (
    <InfoLayout
      header={
        <>
          Cost linking to reports
          <TransferView
            services={services}
            fromAmount={costEntry.remainingAmount}
            toAmount={costEntry.matchedAmount}
          />
          {costEntry.status !== "matched" && (
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
                  Find & link report
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-fit flex flex-col max-h-[calc(-1rem+var(--radix-popover-content-available-height))]">
                <PopoverHeader>
                  Match the cost with a contractor report
                </PopoverHeader>
                <InlineReportSearch
                  showBillingColumns={false}
                  showCostColumns={true}
                  context={{
                    clientId,
                    workspaceId: costEntry.workspace.id,
                    contractorId:
                      costEntry.contractor?.id ?? idSpecUtils.ofAll(),
                  }}
                  className="overflow-y-auto h-full"
                  services={services}
                  renderSelect={(report, button, track) => {
                    const isSameCurrency =
                      report.remainingAmount.currency ===
                      costEntry.remainingAmount.currency;
                    return (
                      <LinkPopover
                        context={{
                          contractorId: report.contractor.id,
                          workspaceId: report.workspace.id,
                          clientId: report.client.id,
                        }}
                        side="right"
                        align="center"
                        services={services}
                        sourceCurrency={costEntry.remainingAmount.currency}
                        title="Link cost to report"
                        sourceLabel="Cost value"
                        targetLabel="Report value"
                        targetCurrency={report.remainingAmount.currency}
                        showBreakdown={true}
                        initialValues={{
                          // billing
                          source: isSameCurrency
                            ? // we have same currency, so probably we don't need to exchange
                              Math.min(
                                costEntry.remainingAmount.amount,
                                report.remainingAmount.amount,
                              )
                            : // this won't be same, so let's assume that cost  = remaining report but in target currency
                              costEntry.remainingAmount.amount,
                          target: isSameCurrency
                            ? Math.min(
                                report.remainingAmount.amount,
                                costEntry.remainingAmount.amount,
                              )
                            : report.remainingAmount.amount,
                          description: [
                            isSameCurrency
                              ? `Currency exchange, 1 ${report.remainingAmount.currency} = [...] ${costEntry.remainingAmount.currency}, exchange cost: [...]`
                              : null,
                          ]
                            .filter(Boolean)
                            .join("\n"),
                        }}
                        onValueChange={(value) =>
                          track(
                            services.mutationService.linkCostAndReport({
                              costId: costEntry.id,
                              costAmount: value.source,
                              reportId: report.id,
                              reportAmount: value.target,
                              description: value.description,
                              breakdown: value.breakdown,
                            }),
                          )
                        }
                      >
                        {button}
                      </LinkPopover>
                    );
                  }}
                  query={reportQueryUtils
                    .getBuilder(costEntry.workspace.id, clientId)
                    .build((x) => [
                      x.withFilter("immediatePaymentDue", {
                        operator: "greaterThan",
                        value: 0,
                      }),
                    ])}
                />
              </PopoverContent>
            </Popover>
          )}
        </>
      }
    >
      <ListView
        data={rd.of(costEntry.linkReports)}
        columns={[
          columnHelper.accessor((x) => x, {
            header: "Link",
            cell: (cellInfo) => {
              const link = cellInfo.getValue<Cost["linkReports"][number]>();
              if (link.report) {
                return (
                  <LinkPopover
                    context={{
                      contractorId: link.report.contractorId,
                      workspaceId: link.report.workspaceId,
                      clientId: idSpecUtils.ofAll(),
                    }}
                    services={services}
                    sourceLabel="Cost amount"
                    targetLabel="Report amount"
                    sourceCurrency={costEntry.netAmount.currency}
                    targetCurrency={link.report.currency}
                    title="Update linked report"
                    showBreakdown={true}
                    initialValues={{
                      source: link.link.costAmount ?? undefined,
                      target: link.link.reportAmount ?? undefined,
                      description: link.link.description,
                      breakdown: link.link.breakdown,
                    }}
                    onValueChange={(value, updates) =>
                      services.mutationService.updateCostReportLink(
                        link.link.id,
                        {
                          ...mapKeys(updates, {
                            source: "costAmount",
                            target: "reportAmount",
                          }),
                          breakdown: value.breakdown,
                        },
                      )
                    }
                  >
                    <Button variant="headless" size="headless">
                      <Badge variant="positive">Report</Badge>
                    </Button>
                  </LinkPopover>
                );
              }
            },
          }),
          {
            ...sharedColumns.contractorId(services),
            accessorKey: "report.contractorId",
          },

          {
            ...reportColumns.period(services),
            accessorFn: (x: Cost["linkReports"][0]) => x.report,
          },
          columnHelper.accessor((x) => x.link, {
            header: "Linking",
            cell: (cellInfo) => {
              const value = cellInfo.getValue();
              return (
                <div className="flex flex-row gap-2 items-center h-full">
                  <div>cost of</div>
                  <div className="text-green-600 font-bold">
                    {services.formatService.financial.amount(
                      value.costAmount,
                      costEntry.netAmount.currency,
                    )}
                  </div>
                  <Shuffle className="size-4" />
                  <div>
                    {services.formatService.financial.amount(
                      value.reportAmount,
                      cellInfo.row.original.report.currency,
                    )}
                  </div>
                  <div>of report</div>
                </div>
              );
            },
          }),
          {
            ...sharedColumns.description,
            accessorKey: "link.description",
            header: "Link description",
          },
          {
            ...sharedColumns.clientId(services),
            accessorKey: "report.clientId",
          },
          {
            ...sharedColumns.description,
            accessorKey: "report.description",
            header: "Report description",
          },
          isDangerMode &&
            columnHelper.display({
              header: "Actions",
              cell: (info) => (
                <Button
                  variant="outline-destructive"
                  size="icon-xs"
                  onClick={() => {
                    linkingState.track(
                      services.mutationService.deleteCostReportLink(
                        info.row.original.link.id,
                      ),
                    );
                  }}
                >
                  <Trash2 />
                </Button>
              ),
            }),
        ].filter(truthy.isTruthy)}
        query={reportQueryUtils.ofDefault(workspaceId, clientId)}
        onQueryChange={() => void 0}
      />
    </InfoLayout>
  );
}
export type CostInfoPopoverProps = CostInfoProps & { children: ReactElement };
export function CostInfoPopover({ children, ...props }: CostInfoPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <InfoPopoverContent align="start" side="bottom">
        <CostInfo {...props} />
      </InfoPopoverContent>
    </Popover>
  );
}
