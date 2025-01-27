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
import {
  InfoLayout,
  InfoPopoverContent,
} from "@/features/_common/info/_common/InfoLayout.tsx";
import { InlineBillingClarify } from "@/features/_common/inline-search/InlineBillingClarify.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { TransferView } from "@/features/_common/TransferView.tsx";
import { assert } from "@/platform/lang/assert.ts";
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
import { maybe, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { createColumnHelper } from "@tanstack/react-table";
import { Check, ChevronsRight, Link2, Loader2 } from "lucide-react";
import { ReactElement } from "react";

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
        columns={[
          columnHelper.accessor("cost", {
            header: "Type",
            cell: (info) =>
              info.row.original.cost ? (
                <Badge variant="positive">Cost</Badge>
              ) : (
                <Badge variant="secondary">Clarification</Badge>
              ),
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
                  <ChevronsRight />
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
        ]}
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
