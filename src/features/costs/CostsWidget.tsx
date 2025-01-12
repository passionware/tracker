import { costQueryUtils } from "@/api/cost/cost.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
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
import { ClientBreadcrumbLink } from "@/features/_common/ClientBreadcrumbLink.tsx";
import { ClientWidget } from "@/features/_common/ClientView.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { CostInfo } from "@/features/_common/info/CostInfo.tsx";
import { ContractorPicker } from "@/features/_common/inline-search/ContractorPicker.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import {
  Summary,
  SummaryEntry,
  SummaryEntryValue,
} from "@/features/_common/Summary.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/WorkspaceBreadcrumbLink.tsx";
import { WorkspaceView } from "@/features/_common/WorkspaceView.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd } from "@passionware/monads";
import { startCase } from "lodash";

export interface CostsWidgetProps
  extends WithServices<
    [
      WithReportDisplayService,
      WithFormatService,
      WithContractorService,
      WithClientService,
      WithWorkspaceService,
      WithPreferenceService,
      WithMutationService,
    ]
  > {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
}

export function CostsWidget(props: CostsWidgetProps) {
  const costs = props.services.reportDisplayService.useCostView(
    costQueryUtils.ofDefault(props.workspaceId, props.clientId),
  );

  return (
    <CommonPageContainer
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <BreadcrumbPage>Costs</BreadcrumbPage>,
      ]}
    >
      <Table>
        <TableCaption className="text-sm text-gray-500 text-left bg-gray-50 p-4 rounded-md">
          <div className="mb-2 font-semibold text-gray-700">
            A list of all costs associated with the selected workspace.
          </div>
          {rd.tryMap(costs, (view) => {
            const billingDetails = [
              { label: "Net total", value: view.total.netAmount },
              // { label: "Charged gross", value: view.total.grossAmount },
              { label: "Total matched", value: view.total.matchedAmount },
              { label: "Total remaining", value: view.total.remainingAmount },
            ];

            return (
              <div>
                <h3 className="my-3 text-base font-semibold text-gray-900">
                  Summary
                </h3>
                <Summary>
                  {billingDetails.map((item) => (
                    <SummaryEntry key={item.label} label={item.label}>
                      {item.value.map((value, index) => (
                        <SummaryEntryValue key={index}>
                          {props.services.formatService.financial.currency(
                            value,
                          )}
                        </SummaryEntryValue>
                      ))}
                    </SummaryEntry>
                  ))}
                </Summary>
              </div>
            );
          })}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Id</TableHead>
            <TableHead>Workspace</TableHead>
            <TableHead>Counterparty</TableHead>
            <TableHead>Invoice Number</TableHead>
            <TableHead>Invoice Date</TableHead>
            <TableHead>Net Value</TableHead>
            <TableHead>Gross Value</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Matched</TableHead>
            <TableHead>Remaining</TableHead>
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
              if (costs.entries.length === 0) {
                return (
                  <TableRow>
                    <TableCell colSpan={8}>No costs found.</TableCell>
                  </TableRow>
                );
              }
              return costs.entries.map((cost) => (
                <TableRow key={cost.id}>
                  <TableCell className="font-medium">{cost.id}</TableCell>
                  <TableCell className="py-0">
                    <WorkspaceView
                      layout="avatar"
                      workspace={rd.of(cost.workspace)}
                    />
                  </TableCell>
                  <TableCell className="py-0">
                    {cost.contractor ? (
                      <>
                        <ContractorPicker
                          value={cost.contractor.id}
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
                    {props.services.formatService.financial.currency(
                      cost.netAmount,
                    )}
                  </TableCell>
                  <TableCell>
                    {cost.grossAmount
                      ? props.services.formatService.financial.currency(
                          cost.grossAmount,
                        )
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger>
                        <Badge
                          variant={
                            (
                              {
                                matched: "positive",
                                unmatched: "destructive",
                                "partially-matched": "warning",
                              } as const
                            )[cost.status]
                          }
                          className=""
                        >
                          {startCase(cost.status)}
                        </Badge>
                      </PopoverTrigger>
                      <PopoverContent className="w-fit">
                        <PopoverHeader>Cost details</PopoverHeader>
                        <CostInfo costEntry={cost} services={props.services} />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell>

                    <div className="empty:hidden flex flex-row gap-1.5 items-center">
                      {props.services.formatService.financial.currency(
                          cost.matchedAmount,
                      )}
                      {cost.linkReports.map((link) => (
                        <ClientWidget
                          layout="avatar"
                          size="xs"
                          key={link.id}
                          clientId={link.contractorReport.clientId}
                          services={props.services}
                        />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {props.services.formatService.financial.currency(
                      cost.remainingAmount,
                    )}
                  </TableCell>
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
