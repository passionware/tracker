import { costQueryUtils } from "@/api/cost/cost.api.ts";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ContractorPicker } from "@/features/_common/inline-search/ContractorPicker.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WorkspaceSpec } from "@/services/front/RoutingService/RoutingService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithCostService } from "@/services/io/CostService/CostService.ts";
import { rd } from "@passionware/monads";

export interface CostsWidgetProps
  extends WithServices<
    [WithCostService, WithFormatService, WithContractorService]
  > {
  workspaceId: WorkspaceSpec;
}

export function CostsWidget(props: CostsWidgetProps) {
  const costs = props.services.costService.useCosts(costQueryUtils.ofDefault());

  return (
    <CommonPageContainer
      segments={[<BreadcrumbPage>Workspace Costs</BreadcrumbPage>]}
    >
      <Table>
        <TableCaption className="text-sm text-gray-500 text-left bg-gray-50 p-4 rounded-md">
          <div className="mb-2 font-semibold text-gray-700">
            A list of all costs associated with the selected workspace.
          </div>
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Id</TableHead>
            <TableHead>Counterparty</TableHead>
            <TableHead>Invoice Number</TableHead>
            <TableHead>Invoice Date</TableHead>
            <TableHead>Net Value</TableHead>
            <TableHead>Gross Value</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead className="text-right">Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rd
            .journey(costs)
            .wait(
              <TableRow>
                {Array(8)
                  .fill(null)
                  .map((_, index) => (
                    <TableCell key={index}>
                      <Skeleton className="w-32 h-6" />
                    </TableCell>
                  ))}
              </TableRow>,
            )
            .catch(renderError)
            .map((costs) => {
              if (costs.length === 0) {
                return (
                  <TableRow>
                    <TableCell colSpan={8}>No costs found.</TableCell>
                  </TableRow>
                );
              }
              return costs.map((cost) => (
                <TableRow key={cost.id}>
                  <TableCell className="font-medium">{cost.id}</TableCell>
                  <TableCell className="py-0">
                    {cost.contractorId ? (
                      <>
                        <ContractorPicker
                          value={cost.contractorId}
                          onSelect={null}
                          services={props.services}
                          size="xs"
                        />
                      </>
                    ) : (
                      <> {cost.counterparty || "N/A"} </>
                    )}
                  </TableCell>
                  <TableCell>{cost.invoiceNumber || "N/A"}</TableCell>
                  <TableCell>
                    {props.services.formatService.temporal.date(
                      cost.invoiceDate,
                    )}
                  </TableCell>
                  <TableCell>
                    {props.services.formatService.financial.amount(
                      cost.netValue,
                      cost.currency,
                    )}
                  </TableCell>
                  <TableCell>
                    {cost.grossValue
                      ? props.services.formatService.financial.amount(
                          cost.grossValue,
                          cost.currency,
                        )
                      : "N/A"}
                  </TableCell>
                  <TableCell>{cost.currency}</TableCell>
                  <TableCell className="text-right">
                    {cost.description || "N/A"}
                  </TableCell>
                </TableRow>
              ));
            })}
        </TableBody>
      </Table>
    </CommonPageContainer>
  );
}
