import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithCostService } from "@/services/io/CostService/CostService.ts";

export interface InlineCostClarifyProps
  extends WithServices<[WithCostService, WithFormatService]> {}
export function InlineCostClarify(props: InlineCostClarifyProps) {
  return <div></div>;
}
