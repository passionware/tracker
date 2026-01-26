import { Report } from "@/api/reports/reports.api.ts";
import { reportQueryUtils } from "@/api/reports/reports.api.ts";
import { InlineReportSearch } from "@/features/_common/elements/inline-search/InlineReportSearch.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ExpressionContext,
  WithExpressionService,
} from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithReportService } from "@/services/io/ReportService/ReportService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { Button } from "@/components/ui/button.tsx";
import { rd } from "@passionware/monads";

export interface ReportPickerProps
  extends WithServices<
    [
      WithReportDisplayService,
      WithFormatService,
      WithClientService,
      WithMutationService,
      WithContractorService,
      WithWorkspaceService,
      WithExpressionService,
      WithReportService,
    ]
  > {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  previewId?: Report["id"];
  onSelect: (reportId: number) => void;
  className?: string;
}

export function ReportPicker({
  services,
  workspaceId,
  clientId,
  previewId,
  onSelect,
  className,
}: ReportPickerProps) {
  const previewReport = previewId
    ? services.reportService.useReport(previewId)
    : rd.ofIdle();

  const query =
    rd.tryMap(previewReport, (report: Report) =>
      reportQueryUtils
        .getBuilder(report.workspaceId, report.clientId)
        .build((q) => [
          q.withFilter("workspaceId", {
            operator: "oneOf",
            value: [report.workspaceId],
          }),
          q.withFilter("clientId", {
            operator: "oneOf",
            value: [report.clientId],
          }),
          q.withFilter("contractorId", {
            operator: "oneOf",
            value: [report.contractorId],
          }),
        ]),
    ) ?? reportQueryUtils.getBuilder(workspaceId, clientId).build(() => []);

  const context: ExpressionContext = rd.tryMap(
    previewReport,
    (report: Report) => ({
      workspaceId: report.workspaceId,
      clientId: report.clientId,
      contractorId: report.contractorId,
    }),
  ) ?? {
    workspaceId,
    clientId,
    contractorId: idSpecUtils.ofAll(),
  };

  return (
    <InlineReportSearch
      services={services}
      query={query}
      context={context}
      renderSelect={(report) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onSelect(report.id);
          }}
        >
          Select
        </Button>
      )}
      showBillingColumns={false}
      showCostColumns={false}
      className={className}
    />
  );
}
