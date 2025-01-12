import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { ClientWidget } from "@/features/_common/ClientView.tsx";
import { DeleteButtonWidget } from "@/features/_common/DeleteButtonWidget.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { TransferView } from "@/features/_common/TransferView.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  CostEntry,
  WithReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { maybe, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Check, Link2, Loader2 } from "lucide-react";

export interface CostInfoProps
  extends WithServices<
    [
      WithFormatService,
      WithReportDisplayService,
      WithPreferenceService,
      WithMutationService,
      WithClientService,
    ]
  > {
  costEntry: CostEntry;
}

export function CostInfo({ costEntry, services }: CostInfoProps) {
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
            <PopoverContent className="w-fit">
              {/*<InlineContractorReportSearch*/}
              {/*    query=*/}
              {/*  maxAmount={costEntry.remainingAmount.amount}*/}
              {/*  services={services}*/}
              {/*  onSelect={(report) =>*/}
              {/*    // linkingState.track(*/}
              {/*    //   services.mutationService.linkReportAndCost({*/}
              {/*    //     costId: costEntry.id,*/}
              {/*    //     contractorReportId: report.id,*/}
              {/*    //     linkAmount: report.netValue,*/}
              {/*    //   }),*/}
              {/*    // )*/}
              {/*  }*/}
              {/*/>*/}
            </PopoverContent>
          </Popover>
        </div>
      )}

      <Separator className="my-2" />
      <div className="text-sm text-gray-700 font-medium my-1 text-center">
        Linked Contractor Reports
      </div>
      <Separator className="my-2" />

      <div className="space-y-8">
        {costEntry.linkReports.map((link) => (
          <div className="flex items-stretch gap-2" key={link.id}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-row justify-between items-center gap-2 items-center">
                <Badge variant="positive">Report</Badge>
                <Badge variant="secondary" size="sm">
                  {services.formatService.temporal.date(
                    link.contractorReport.periodStart,
                  )}
                  -
                  {services.formatService.temporal.date(
                    link.contractorReport.periodEnd,
                  )}
                </Badge>
              </div>
              <div className="text-sm font-medium leading-none shrink-0 w-fit flex flex-row gap-2 items-center">
                Cost's
                {services.formatService.financial.currency(link.costAmount)}
                <div className="text-gray-500">satisfies</div>
                {services.formatService.financial.currency(link.reportAmount)}
                of report's
                {services.formatService.financial.amount(
                  link.contractorReport.netValue,
                  link.contractorReport.currency,
                )}
                for
                <ClientWidget
                  services={services}
                  size="sm"
                  layout="avatar"
                  clientId={link.contractorReport.clientId}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-slate-600">
                {link.contractorReport.contractor?.fullName}
              </div>
              <div className="text-gray-600 text-xs mr-1.5 max-w-64 border border-gray-300 rounded p-1 bg-gray-50 block min-w-24 whitespace-pre-line">
                {maybe.getOrElse(
                  maybe.fromTruthy(link.description),
                  <div className="text-slate-400">No description</div>,
                )}
              </div>
            </div>
            <DeleteButtonWidget
              services={services}
              onDelete={async () => {
                // services.mutationService.deleteCostReportLink(link.id);
              }}
            />
          </div>
        ))}
        {costEntry.linkReports.length === 0 && (
          <div className="text-gray-500 text-center flex flex-row gap-2 items-center">
            No linked contractor reports.
          </div>
        )}
      </div>
    </div>
  );
}
