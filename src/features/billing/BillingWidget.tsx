import { clientBillingQueryUtils } from "@/api/client-billing/client-billing.api.ts";
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
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ChargeInfo } from "@/features/_common/info/ChargeInfo.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
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
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, rd } from "@passionware/monads";

export function BillingWidget(
  props: { clientId: ClientSpec; workspaceId: WorkspaceSpec } & WithServices<
    [
      WithReportDisplayService,
      WithFormatService,
      WithClientService,
      WithMutationService /*todo use auth flow*/,
      WithPreferenceService,
      WithWorkspaceService,
    ]
  >,
) {
  const billings = props.services.reportDisplayService.useBillingView(
    clientBillingQueryUtils.ofDefault(props.workspaceId, props.clientId),
  );

  return (
    <CommonPageContainer
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <BreadcrumbPage>Client Invoices</BreadcrumbPage>,
      ]}
    >
      <Table>
        <TableCaption className="text-sm text-gray-500 text-left bg-gray-50 p-4 rounded-md">
          <div className="mb-2 font-semibold text-gray-700">
            A list of all billings for the selected client.
          </div>
          {rd.tryMap(billings, (view) => {
            const billingDetails = [
              { label: "Charged", value: view.total.netAmount },
              // { label: "Charged gross", value: view.total.grossAmount },
              { label: "Reconciled", value: view.total.matchedAmount },
              { label: "To reconcile", value: view.total.remainingAmount },
            ];

            return (
              <div>
                <h3 className="my-3 text-base font-semibold text-gray-900">
                  Sumary
                </h3>
                <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-4">
                  {billingDetails.map((item) => (
                    <div
                      key={item.label}
                      className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6"
                    >
                      <dt className="truncate text-sm font-medium text-gray-500">
                        {item.label}
                      </dt>
                      <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                        {maybe.mapOrElse(
                          item.value,
                          props.services.formatService.financial.currency,
                          "-",
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="">Id</TableHead>
            <TableHead>Issuer</TableHead>
            <TableHead>Invoice Number</TableHead>
            <TableHead>Invoice Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Net Amount</TableHead>
            <TableHead>Gross Amount</TableHead>
            <TableHead>Matched Amount</TableHead>
            <TableHead>Remaining Amount</TableHead>
            <TableHead className="text-right">Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rd
            .journey(billings)
            .wait(
              <TableRow>
                {Array(9)
                  .fill(null)
                  .map((_, index) => (
                    <TableCell key={index}>
                      <Skeleton className="w-32 h-6" />
                    </TableCell>
                  ))}
              </TableRow>,
            )
            .catch(renderError)
            .map((billings) => {
              if (billings.entries.length === 0) {
                return (
                  <TableRow>
                    <TableCell colSpan={8}>No billings found.</TableCell>
                  </TableRow>
                );
              }
              return billings.entries.map((billing) => (
                <TableRow key={billing.id}>
                  <TableCell className="font-medium">{billing.id}</TableCell>
                  <TableCell>
                    <WorkspaceView
                      layout="avatar"
                      workspace={rd.of(billing.workspace)}
                    />
                  </TableCell>
                  <TableCell>{billing.invoiceNumber}</TableCell>
                  <TableCell>
                    {props.services.formatService.temporal.date(
                      billing.invoiceDate,
                    )}
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger>
                        <Badge
                          tone="solid"
                          variant={
                            (
                              {
                                matched: "positive",
                                unmatched: "destructive",
                                "partially-matched": "warning",
                                clarified: "secondary",
                              } as const
                            )[billing.status]
                          }
                        >
                          {
                            (
                              {
                                matched: "Matched",
                                unmatched: "Unmatched",
                                "partially-matched": "Partially Matched",
                                clarified: "Clarified",
                              } as const
                            )[billing.status]
                          }
                        </Badge>
                      </PopoverTrigger>
                      <PopoverContent className="w-fit">
                        <PopoverHeader>Invoice details</PopoverHeader>
                        <ChargeInfo
                          services={props.services}
                          billing={billing}
                          clientId={props.clientId}
                          workspaceId={props.workspaceId}
                        />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell>
                    {props.services.formatService.financial.amount(
                      billing.netAmount.amount,
                      billing.netAmount.currency,
                    )}
                  </TableCell>
                  <TableCell>
                    {props.services.formatService.financial.amount(
                      billing.grossAmount.amount,
                      billing.grossAmount.currency,
                    )}
                  </TableCell>
                  <TableCell>
                    {props.services.formatService.financial.amount(
                      billing.matchedAmount.amount,
                      billing.matchedAmount.currency,
                    )}
                  </TableCell>
                  <TableCell>
                    {props.services.formatService.financial.amount(
                      billing.remainingAmount.amount,
                      billing.remainingAmount.currency,
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {billing.description || "N/A"}
                  </TableCell>
                </TableRow>
              ));
            })}
        </TableBody>
      </Table>
    </CommonPageContainer>
  );
}
