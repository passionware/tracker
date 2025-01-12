import { clientBillingQueryUtils } from "@/api/client-billing/client-billing.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
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
import { ChargeInfo } from "@/features/_common/info/ChargeInfo.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import {
  renderError,
  renderSmallError,
} from "@/features/_common/renderError.tsx";
import {
  Summary,
  SummaryEntry,
  SummaryEntryValue,
} from "@/features/_common/Summary.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/WorkspaceBreadcrumbLink.tsx";
import { WorkspaceView } from "@/features/_common/WorkspaceView.tsx";
import { NewClientBillingWidget } from "@/features/billing/NewClientBillingWidget.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
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
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Check, Loader2, PlusCircle } from "lucide-react";

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

  const addBillingState = promiseState.useRemoteData();

  return (
    <CommonPageContainer
      tools={
        <>
          <InlinePopoverForm
            trigger={
              <Button variant="default" size="sm" className="flex">
                {rd
                  .fullJourney(addBillingState.state)
                  .initially(<PlusCircle />)
                  .wait(<Loader2 />)
                  .catch(renderSmallError("w-6 h-6"))
                  .map(() => (
                    <Check />
                  ))}
                Add client billing
              </Button>
            }
            content={(bag) => (
              <>
                <PopoverHeader>Add new billing</PopoverHeader>
                <NewClientBillingWidget
                  onCancel={bag.close}
                  defaultWorkspaceId={idSpecUtils.switchAll(
                    props.workspaceId,
                    undefined,
                  )}
                  defaultCurrency={rd.tryMap(
                    billings,
                    (reports) =>
                      reports.entries[reports.entries.length - 1]?.netAmount
                        .currency,
                  )}
                  defaultInvoiceDate={new Date()}
                  defaultClientId={idSpecUtils.switchAll(
                    props.clientId,
                    undefined,
                  )}
                  services={props.services}
                  onSubmit={(data) =>
                    addBillingState.track(
                      props.services.mutationService
                        .createClientBilling(data)
                        .then(bag.close),
                    )
                  }
                />
              </>
            )}
          />
        </>
      }
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
            <TableHead className="">Id</TableHead>
            <TableHead>Issuer</TableHead>
            <TableHead>Client</TableHead>
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
              <>
                {Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 11 }).map((_, i) => (
                      <TableCell key={i}>
                        <Skeleton className="w-full h-8" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>,
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
                  <TableCell>
                    <ClientWidget
                      layout="avatar"
                      size="xs"
                      clientId={billing.clientId}
                      services={props.services}
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
                    <div className="empty:hidden flex flex-row gap-1.5 items-center">
                      {props.services.formatService.financial.amount(
                        billing.matchedAmount.amount,
                        billing.matchedAmount.currency,
                      )}
                      {billing.links
                        .filter((l) => l.type === "reconcile")
                        .map((link) => (
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
