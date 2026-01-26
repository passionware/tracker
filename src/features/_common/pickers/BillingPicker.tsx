import { billingQueryUtils } from "@/api/billing/billing.api.ts";
import { InlineBillingSearch } from "@/features/_common/inline-search/InlineBillingSearch.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ExpressionContext,
  WithExpressionService,
} from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { CurrencyValue } from "@/services/ExchangeService/ExchangeService.ts";

export interface BillingPickerProps
  extends WithServices<
    [
      WithReportDisplayService,
      WithFormatService,
      WithClientService,
      WithExpressionService,
      WithWorkspaceService,
      WithContractorService,
    ]
  > {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  onSelect: (billingId: number) => void;
  className?: string;
}

export function BillingPicker({
  services,
  workspaceId,
  clientId,
  onSelect,
  className,
}: BillingPickerProps) {
  const query = billingQueryUtils.ensureDefault(
    billingQueryUtils.ofDefault(workspaceId, clientId),
    workspaceId,
    clientId,
  );

  const context: ExpressionContext = {
    workspaceId,
    clientId,
    contractorId: idSpecUtils.ofAll(),
  };

  // Create a dummy maxAmount for the inline search
  const maxAmount: CurrencyValue = {
    amount: 0,
    currency: "EUR",
  };

  return (
    <InlineBillingSearch
      services={services}
      query={query}
      context={context}
      onSelect={(data) => onSelect(data.billingId)}
      maxAmount={maxAmount}
      className={className}
    />
  );
}
