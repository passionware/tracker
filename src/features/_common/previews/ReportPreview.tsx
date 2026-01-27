import { Report } from "@/api/reports/reports.api.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget.tsx";
import { CommitStatusBadge } from "@/features/_common/elements/CommitStatusBadge.tsx";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { WithServices } from "@/platform/typescript/services";
import { WithExchangeService } from "@/services/ExchangeService/ExchangeService";
import { WithFormatService } from "@/services/FormatService/FormatService";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService";
import { WithMutationService } from "@/services/io/MutationService/MutationService";
import { WithReportService } from "@/services/io/ReportService/ReportService";
import { maybe, rd } from "@passionware/monads";

export interface ReportPreviewProps
  extends WithServices<
    [
      WithReportService,
      WithMutationService,
      WithContractorService,
      WithFormatService,
      WithExchangeService,
    ]
  > {
  reportId: Report["id"];
}

export function ReportPreview({ services, reportId }: ReportPreviewProps) {
  const report = services.reportService.useReport(reportId);

  return rd
    .journey(report)
    .wait(
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>,
    )
    .catch(renderError)
    .map((report) => (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ContractorWidget
            contractorId={maybe.of(report.contractor.id)}
            services={services}
            layout="avatar"
            size="sm"
          />
          <span className="text-sm font-medium text-slate-700">
            Report #{report.id}
          </span>
          <CommitStatusBadge
            id={report.id}
            isCommitted={report.isCommitted}
            entityType="report"
            services={services}
          />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Net Value:</span>
            <span className="font-medium">
              <CurrencyValueWidget
                values={[
                  {
                    amount: report.netValue,
                    currency: report.currency,
                  },
                ]}
                services={services}
                exchangeService={services.exchangeService}
              />
            </span>
          </div>

          {report.quantity !== null && report.quantity !== undefined && (
            <div className="flex justify-between">
              <span className="text-slate-500">Quantity:</span>
              <span className="font-medium">
                {report.quantity.toFixed(2)} {report.unit || "h"}
              </span>
            </div>
          )}

          {report.unitPrice !== null && report.unitPrice !== undefined && (
            <div className="flex justify-between">
              <span className="text-slate-500">Unit Price:</span>
              <span className="font-medium">
                {services.formatService.financial.amount(
                  report.unitPrice,
                  report.currency,
                )}
                /{report.unit || "h"}
              </span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-slate-500">Period:</span>
            <span className="font-medium text-xs">
              {services.formatService.temporal.range.compact(
                report.periodStart,
                report.periodEnd,
              )}
            </span>
          </div>

          {report.description && (
            <div className="pt-2 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                <div className="font-medium mb-1">Description:</div>
                <div className="text-slate-600 whitespace-pre-wrap">
                  {report.description}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    ));
}
