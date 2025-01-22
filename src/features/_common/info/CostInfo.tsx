import { reportQueryUtils } from "@/api/reports/reports.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { DeleteButtonWidget } from "@/features/_common/DeleteButtonWidget.tsx";
import { ClientWidget } from "@/features/_common/elements/pickers/ClientView.tsx";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView.tsx";
import { LinkPopover } from "@/features/_common/filters/LinkPopover.tsx";
import { InlineReportSearchWidget } from "@/features/_common/info/InlineReportSearchWidget.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { TransferView } from "@/features/_common/TransferView.tsx";
import { cn } from "@/lib/utils.ts";
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
import { maybe, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { mapKeys } from "@passionware/platform-ts";
import { Check, Link2, Loader2 } from "lucide-react";

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

export function CostInfo({ costEntry, services, clientId }: CostInfoProps) {
  const linkingState = promiseState.useRemoteData();

  return (
    <div className="flex flex-col gap-4">
      <TransferView
        services={services}
        fromAmount={costEntry.remainingAmount}
        toAmount={costEntry.matchedAmount}
      />
      {costEntry.remainingAmount.amount > 0 && (
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
                Find & link report
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-fit flex flex-col max-h-[calc(-1rem+var(--radix-popover-content-available-height))]">
              <PopoverHeader>
                Match the cost with a contractor report
              </PopoverHeader>
              <InlineReportSearchWidget
                context={{
                  clientId,
                  workspaceId: costEntry.workspace.id,
                  contractorId: idSpecUtils.ofAll(),
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
                      sourceCurrency={report.remainingAmount.currency}
                      title="Link contractor report"
                      sourceLabel="Billing value"
                      targetLabel="Report value"
                      targetCurrency={report.remainingAmount.currency}
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
                          }),
                        )
                      }
                    >
                      {button}
                    </LinkPopover>
                  );
                }}
                query={reportQueryUtils.ofDefault(
                  costEntry.workspace.id,
                  clientId,
                )}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      <Separator className="my-2" />
      <div className="text-sm text-gray-700 font-medium my-1 text-center">
        Linked Contractor Reports
      </div>
      <Separator className="my-2" />

      <ul role="list" className="divide-y divide-gray-100">
        {costEntry.linkReports.map((link) => {
          return (
            <li
              key={link.link.id}
              className="flex items-center justify-between gap-x-6 py-5"
            >
              <div className="min-w-0">
                {link.report && (
                  <div className="flex items-start gap-x-3">
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
                      initialValues={{
                        source: link.link.costAmount ?? undefined,
                        target: link.link.reportAmount ?? undefined,
                        description: link.link.description,
                      }}
                      onValueChange={(_all, updates) =>
                        services.mutationService.updateCostReportLink(
                          link.link.id,
                          mapKeys(updates, {
                            source: "costAmount",
                            target: "reportAmount",
                          }),
                        )
                      }
                    >
                      <Button variant="headless" size="headless">
                        <Badge variant="positive">Report</Badge>
                      </Button>
                    </LinkPopover>
                    <Badge variant="primary" tone="secondary" className={cn()}>
                      {services.formatService.temporal.date(
                        link.report.periodStart,
                      )}{" "}
                      -{" "}
                      {services.formatService.temporal.date(
                        link.report.periodEnd,
                      )}
                    </Badge>
                  </div>
                )}
                {link.report && (
                  <>
                    <div className="mt-1 flex items-center gap-x-2 text-xs/5 text-gray-500">
                      <ContractorWidget
                        services={services}
                        contractorId={link.report.contractorId}
                        layout="avatar"
                      />
                      <div className="contents text-green-800 font-bold">
                        Cost's{" "}
                        {services.formatService.financial.amount(
                          link.link.costAmount,
                          costEntry.netAmount.currency,
                        )}
                      </div>
                      <svg viewBox="0 0 2 2" className="size-0.5 fill-current">
                        <circle r={1} cx={1} cy={1} />
                      </svg>
                      satisfies{" "}
                      {services.formatService.financial.amount(
                        link.link.reportAmount,
                        link.report.currency,
                      )}{" "}
                      of{" "}
                      <ClientWidget
                        services={services}
                        size="sm"
                        layout="avatar"
                        clientId={link.report.clientId}
                      />
                      's report{" "}
                      {services.formatService.financial.amount(
                        link.report.netValue,
                        link.report.currency,
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="flex flex-none items-center gap-x-4">
                {link.report?.contractorId && (
                  <div className="text-xs text-slate-600">
                    <ContractorWidget
                      contractorId={link.report.contractorId}
                      services={services}
                    />
                  </div>
                )}
                <div className="text-gray-600 text-xs mr-1.5 max-w-64 border border-gray-300 rounded p-1 bg-gray-50 block min-w-24 whitespace-pre-line">
                  <SimpleTooltip title={link.link.description}>
                    <div className="line-clamp-3 overflow-hidden text-ellipsis break-all text-[8pt] leading-3 text-slate-800">
                      {maybe.getOrElse(
                        maybe.fromTruthy(link.link.description),
                        <div className="text-slate-400">No description</div>,
                      )}
                    </div>
                  </SimpleTooltip>
                </div>
                <DeleteButtonWidget
                  services={services}
                  onDelete={() =>
                    services.mutationService.deleteCostReportLink(link.link.id)
                  }
                />
              </div>
            </li>
          );
        })}
        {costEntry.linkReports.length === 0 && (
          <div className="text-gray-500 text-center flex flex-row gap-2 items-center">
            No linked contractor reports.
          </div>
        )}
      </ul>
    </div>
  );
}
