import { paginationUtils } from "@/api/_common/query/pagination.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { costColumns } from "@/features/_common/columns/cost.tsx";
import { LinkPopover } from "@/features/_common/filters/LinkPopover.tsx";
import {
  InfoLayout,
  InfoPopoverContent,
} from "@/features/_common/info/_common/InfoLayout.tsx";
import { InlineBillingClarify } from "@/features/_common/inline-search/InlineBillingClarify.tsx";
import {
  ListToolbar,
  ListToolbarButton,
} from "@/features/_common/ListToolbar.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { TransferView } from "@/features/_common/TransferView.tsx";
import { assert } from "@/platform/lang/assert.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
import {
  ReportViewEntry,
  WithReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithRoutingService } from "@/services/front/RoutingService/RoutingService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import {
  SelectionState,
  selectionState,
  useSelectionCleanup,
} from "@/platform/lang/SelectionState.ts";
import { maybe, mt, rd, truthy } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { mapKeys } from "@passionware/platform-ts";
import { createColumnHelper } from "@tanstack/react-table";
import { Check, Link2, Loader2, Shuffle, Trash2 } from "lucide-react";
import { ReactElement, useState } from "react";
import { toast } from "sonner";

export interface ReportCostInfoProps
  extends WithServices<
    [
      WithFormatService,
      WithMutationService,
      WithReportDisplayService,
      WithPreferenceService,
      WithContractorService,
      WithExpressionService,
      WithWorkspaceService,
      WithClientService,
      WithRoutingService,
    ]
  > {
  report: ReportViewEntry;
}

const columnHelper = createColumnHelper<ReportViewEntry["costLinks"][number]>();

export function ReportCostInfo({ services, report }: ReportCostInfoProps) {
  const linkingState = promiseState.useRemoteData();
  const clarifyState = promiseState.useRemoteData();

  const isDangerMode = services.preferenceService.useIsDangerMode();

  const [selection, setSelection] = useState<SelectionState<number>>(
    selectionState.selectNone(),
  );

  useSelectionCleanup(
    selection,
    maybe.of(report.costLinks.map((link) => link.link.id)),
    setSelection,
  );

  const selectedLinkIds = selectionState.getSelectedIds(
    selection,
    report.costLinks.map((link) => link.link.id),
  );

  const deleteMutation = promiseState.useMutation(async () => {
    if (selectedLinkIds.length === 0) {
      return;
    }

    try {
      await services.mutationService.bulkDeleteCostReportLink(selectedLinkIds);
      setSelection(selectionState.selectNone());
      toast.success(`Successfully deleted ${selectedLinkIds.length} link(s)`);
    } catch (error) {
      console.error("Error deleting links:", error);
      toast.error("Failed to delete links");
    }
  });

  async function handleBatchDelete() {
    if (selectedLinkIds.length === 0) return;
    await deleteMutation.track(void 0);
  }

  return (
    <InfoLayout
      header={
        <>
          Report's linking to costs
          <TransferView
            fromAmount={report.remainingCompensationAmount}
            toAmount={report.compensatedAmount}
            // extraAmount={report.remainingFullCompensationAmount}
            fromLabel="Remaining"
            toLabel="Paid"
            // extraLabel="Compensated"
            services={services}
          />
          {report.remainingCompensationAmount.amount > 0 && (
            <div className="flex gap-2 flex-row self-end">
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
                    Find & link cost
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-fit flex flex-col max-h-[calc(-1rem+var(--radix-popover-content-available-height))]">
                  <PopoverHeader>
                    Match the report with a cost entry
                  </PopoverHeader>
                  {/*todo inline searc*/}
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
                    maxAmount={report.remainingCompensationAmount.amount}
                    services={services}
                    onSelect={(data) => {
                      assert(data.linkType === "clarify");
                      assert(
                        maybe.isPresent(data.reportAmount),
                        "Only report clarifications are allowed",
                      );
                      void clarifyState.track(
                        services.mutationService.linkReportAndBilling(data),
                      );
                    }}
                    context={{ reportId: report.id, billingId: -1 }} // stop reusing InlineBilingClarify for cost clarifications
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </>
      }
    >
      <ListView
        query={{ page: paginationUtils.ofDefault(), sort: null }}
        onQueryChange={() => {}}
        data={rd.of(report.costLinks)}
        selection={selection}
        onSelectionChange={setSelection}
        getRowId={(row: ReportViewEntry["costLinks"][number]) => row.link.id}
        columns={[
          columnHelper.accessor("cost", {
            header: "Type",
            cell: (info) => {
              const link = info.row.original;
              if (!link.cost) {
                return (
                  <Badge variant="warning" size="sm">
                    Clarification
                  </Badge>
                );
              }
              assert(link.link.costId, "cost is missing");
              assert(link.link.reportId, "report is missing");
              return (
                <LinkPopover
                  context={{
                    contractorId: report.contractor.id,
                    workspaceId: report.workspace.id,
                    clientId: idSpecUtils.ofAll(),
                  }}
                  services={services}
                  sourceLabel="Report amount"
                  targetLabel="Cost amount"
                  sourceCurrency={report.netAmount.currency}
                  targetCurrency={link.cost.currency}
                  title="Update linked cost"
                  showBreakdown={true}
                  initialValues={{
                    source: link.link.reportAmount,
                    target: link.link.costAmount,
                    description: link.link.description,
                    breakdown: link.link.breakdown
                      ? {
                          quantity: link.link.breakdown.quantity,
                          unit: link.link.breakdown.unit,
                          sourceUnitPrice: link.link.breakdown.reportUnitPrice,
                          targetUnitPrice: link.link.breakdown.costUnitPrice,
                          exchangeRate: link.link.breakdown.exchangeRate,
                          sourceCurrency: link.link.breakdown.reportCurrency,
                          targetCurrency: link.link.breakdown.costCurrency,
                        }
                      : undefined,
                  }}
                  onValueChange={(value, updates) =>
                    services.mutationService.updateCostReportLink(
                      link.link.id,
                      {
                        ...mapKeys(updates, {
                          source: "reportAmount",
                          target: "costAmount",
                        }),
                        breakdown: value.breakdown
                          ? {
                              quantity: value.breakdown.quantity ?? 0,
                              unit: value.breakdown.unit ?? "",
                              reportUnitPrice:
                                value.breakdown.sourceUnitPrice ?? 0,
                              costUnitPrice:
                                value.breakdown.targetUnitPrice ?? 0,
                              exchangeRate: value.breakdown.exchangeRate ?? 1,
                              reportCurrency:
                                value.breakdown.sourceCurrency ?? "",
                              costCurrency:
                                value.breakdown.targetCurrency ?? "",
                            }
                          : undefined,
                      },
                    )
                  }
                >
                  <Button variant="headless" size="headless">
                    {(() => {
                      if (link.link.reportAmount < link.link.costAmount) {
                        return (
                          <Badge variant="warning" size="sm">
                            Overcosted
                          </Badge>
                        );
                      }
                      if (link.link.reportAmount > link.link.costAmount) {
                        return <Badge variant="destructive">Undercosted</Badge>;
                      }
                      return <Badge variant="positive">Cost</Badge>;
                    })()}
                  </Button>
                </LinkPopover>
              );
            },
          }),
          { ...costColumns.counterparty, accessorKey: "cost.counterparty" },
          columnHelper.accessor("cost.invoiceDate", {
            header: "Invoice date",
            cell: (info) =>
              maybe.mapOrElse(
                info.row.original.cost,
                (cost) =>
                  services.formatService.temporal.single.compact(
                    cost.invoiceDate,
                  ),
                "-",
              ),
          }),
          columnHelper.display({
            header: "Invoice number",
            cell: (info) =>
              maybe.mapOrElse(
                info.row.original.cost,
                (cost) => (
                  <SimpleTooltip title={cost.description}>
                    <div>{cost.invoiceNumber}</div>
                  </SimpleTooltip>
                ),
                "-",
              ),
          }),
          columnHelper.accessor((x) => x.link, {
            header: "Linking",
            cell: (cellInfo) => {
              const { cost, link } = cellInfo.row.original;
              const element = cost ? (
                <div className="flex flex-row gap-2 items-center h-full">
                  <div>work of</div>
                  <div className="text-green-600 font-bold">
                    {services.formatService.financial.amount(
                      link.reportAmount,
                      report.netAmount.currency,
                    )}
                  </div>
                  <Shuffle className="size-4" />
                  <div>
                    {services.formatService.financial.amount(
                      link.costAmount,
                      cost?.currency,
                    )}
                  </div>
                  <div>of cost</div>
                </div>
              ) : (
                <div>
                  Clarification of{" "}
                  {services.formatService.financial.amount(
                    link.reportAmount,
                    report.netAmount.currency,
                  )}
                </div>
              );
              return (
                <SimpleTooltip title={link.description}>
                  {element}
                </SimpleTooltip>
              );
            },
          }),
          columnHelper.accessor("cost", {
            header: "Cost net",
            cell: (info) =>
              maybe.mapOrElse(
                info.row.original.cost,
                (cost) =>
                  services.formatService.financial.amount(
                    cost.netValue,
                    cost.currency,
                  ),
                "-",
              ),
          }),
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
        toolbar={
          selectionState.getTotalSelected(selection, report.costLinks.length) >
          0 ? (
            <ListToolbar>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {selectionState.getTotalSelected(
                    selection,
                    report.costLinks.length,
                  )}{" "}
                  selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <div>
                      <ListToolbarButton variant="destructive">
                        Delete
                      </ListToolbarButton>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4" align="start">
                    <div className="space-y-3">
                      <div className="text-sm text-slate-700">
                        Are you sure you want to delete {selectedLinkIds.length}{" "}
                        selected link(s)? This action cannot be undone.
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm">
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleBatchDelete}
                          disabled={mt.isInProgress(deleteMutation.state)}
                        >
                          {mt.isInProgress(deleteMutation.state)
                            ? "Deleting..."
                            : "Confirm"}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </ListToolbar>
          ) : undefined
        }
      />
      <div className="mt-4 text-sm text-gray-600">
        Ensure all costs are correctly linked to this report to maintain
        accurate financial tracking.
      </div>
    </InfoLayout>
  );
}

export type ReportCostInfoPopoverProps = ReportCostInfoProps & {
  children: ReactElement;
};

export function ReportCostInfoPopover({
  children,
  ...props
}: ReportCostInfoPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <InfoPopoverContent align="start" side="bottom">
        <ReportCostInfo {...props} />
      </InfoPopoverContent>
    </Popover>
  );
}
