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
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { Button } from "@/components/ui/button.tsx";

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
    ]
  > {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  onSelect: (reportId: number) => void;
  className?: string;
}

export function ReportPicker({
  services,
  workspaceId,
  clientId,
  onSelect,
  className,
}: ReportPickerProps) {
  const query = reportQueryUtils
    .getBuilder(workspaceId, clientId)
    .build(() => []);

  const context: ExpressionContext = {
    workspaceId,
    clientId,
    contractorId: idSpecUtils.ofAll(),
  };

  return (
    <InlineReportSearch
      services={services}
      query={query}
      context={context}
      renderSelect={(report, button, track) => (
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
