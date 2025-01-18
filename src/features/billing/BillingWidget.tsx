import { clientBillingQueryUtils } from "@/api/client-billing/client-billing.api.ts";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import { PopoverHeader } from "@/components/ui/popover.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/ClientBreadcrumbLink.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { FilterChip } from "@/features/_common/FilterChip.tsx";
import { ContractorQueryControl } from "@/features/_common/filters/ContractorQueryControl.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { Summary } from "@/features/_common/Summary.tsx";
import { SummaryCurrencyGroup } from "@/features/_common/SummaryCurrencyGroup.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/WorkspaceBreadcrumbLink.tsx";
import { BillingWidgetProps } from "@/features/billing/BillingWidget.types.ts";
import { NewClientBillingWidget } from "@/features/billing/NewClientBillingWidget.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Check, Loader2, PlusCircle } from "lucide-react";
import { useState } from "react";
import { useColumns } from "./BillingWidget.columns";

export function BillingWidget(props: BillingWidgetProps) {
  const [query, setQuery] = useState(
    clientBillingQueryUtils.ofDefault(props.workspaceId, props.clientId),
  );
  const billings = props.services.reportDisplayService.useBillingView(
    clientBillingQueryUtils.ensureDefault(
      query,
      props.workspaceId,
      props.clientId,
    ),
  );

  const addBillingState = promiseState.useRemoteData();
  const columns = useColumns(props);

  return (
    <CommonPageContainer
      tools={
        <>
          <FilterChip label="Contractor">
            <ContractorQueryControl
              allowClear
              allowUnassigned
              filter={query.filters.contractorId}
              onFilterChange={(x) =>
                setQuery(
                  clientBillingQueryUtils.setFilter(query, "contractorId", x),
                )
              }
              services={props.services}
            />
          </FilterChip>
          <InlinePopoverForm
            trigger={
              <Button variant="accent1" size="sm" className="flex">
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
                  defaultValues={{
                    workspaceId: idSpecUtils.switchAll(
                      props.workspaceId,
                      undefined,
                    ),
                    currency: rd.tryMap(
                      billings,
                      (reports) =>
                        reports.entries[reports.entries.length - 1]?.netAmount
                          .currency,
                    ),
                    invoiceDate: new Date(),
                    clientId: idSpecUtils.switchAll(props.clientId, undefined),
                  }}
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
      <ListView
        data={rd.map(billings, (x) => x.entries)}
        columns={columns}
        caption={
          <>
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
                    Summary ({view.entries.length} invoices)
                  </h3>
                  <Summary>
                    {billingDetails.map((item) => (
                      <SummaryCurrencyGroup
                        key={item.label}
                        label={item.label}
                        group={item.value}
                        services={props.services}
                      />
                    ))}
                  </Summary>
                </div>
              );
            })}
          </>
        }
      />
    </CommonPageContainer>
  );
}
