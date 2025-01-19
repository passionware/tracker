import { costQueryUtils } from "@/api/cost/cost.api.ts";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import { PopoverHeader } from "@/components/ui/popover.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
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
import { CostForm } from "@/features/costs/CostForm.tsx";
import { useColumns } from "@/features/costs/CostWidget.columns.tsx";
import { PotentialCostWidgetProps } from "@/features/costs/CostWidget.types.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { chain } from "lodash";
import { Check, Loader2, PlusCircle } from "lucide-react";
import { useState } from "react";

export function PotentialCostWidget(props: PotentialCostWidgetProps) {
  const [query, setQuery] = useState(
    costQueryUtils.ofDefault(props.workspaceId, props.clientId),
  );

  const costs = props.services.reportDisplayService.useCostView(
    chain(
      costQueryUtils.ensureDefault(
        query,
        props.workspaceId,
        idSpecUtils.ofAll(),
      ),
    )
      .thru((x) =>
        idSpecUtils.mapSpecificOrElse(
          props.clientId,
          (clientId) =>
            costQueryUtils.setFilter(x, "potentialClientId", {
              operator: "oneOf",
              value: [clientId],
            }),
          x,
        ),
      )
      /**
       * TODO: we can have a special place in the app, where we can see all unmatched costs that couldn't be even potentially matched
       * Now, when we go to potential costs for all companies, we simply show all unmatched costs
       * thru((x) =>
       *         costQueryUtils.setFilter(x, "potentialClientId", {
       *           operator: "oneOf",
       *           value: [idSpecUtils.switchAll(props.clientId, -1)],
       *         }),
       *       )
       */
      .thru((x) =>
        costQueryUtils.setFilter(x, "linkedRemainder", {
          operator: "greaterThan",
          value: 0,
        }),
      )
      .value(),
  );

  const addCostState = promiseState.useRemoteData<void>();

  const columns = useColumns(props);

  return (
    <CommonPageContainer
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <BreadcrumbPage>Costs</BreadcrumbPage>,
      ]}
      tools={
        <>
          <FilterChip label="Contractor">
            <ContractorQueryControl
              allowClear
              allowUnassigned
              filter={query.filters.contractorId}
              onFilterChange={(x) =>
                setQuery(costQueryUtils.setFilter(query, "contractorId", x))
              }
              services={props.services}
            />
          </FilterChip>
          <InlinePopoverForm
            trigger={
              <Button variant="accent1" size="sm" className="flex">
                {rd
                  .fullJourney(addCostState.state)
                  .initially(<PlusCircle />)
                  .wait(<Loader2 />)
                  .catch(renderSmallError("w-6 h-6"))
                  .map(() => (
                    <Check />
                  ))}
                Add cost
              </Button>
            }
            content={(bag) => (
              <>
                <PopoverHeader>Add new cost</PopoverHeader>
                <CostForm
                  onCancel={bag.close}
                  defaultValues={{
                    workspaceId: idSpecUtils.switchAll(
                      props.workspaceId,
                      undefined,
                    ),
                    currency: rd.tryMap(
                      costs,
                      (reports) =>
                        reports.entries[reports.entries.length - 1]?.netAmount
                          .currency,
                    ),
                    invoiceDate: new Date(),
                  }}
                  services={props.services}
                  onSubmit={(data) =>
                    addCostState.track(
                      props.services.mutationService
                        .createCost(data)
                        .then(bag.close),
                    )
                  }
                />
              </>
            )}
          />
        </>
      }
    >
      <ListView
        data={rd.map(costs, (x) => x.entries)}
        columns={columns}
        onRowDoubleClick={async (x) => {
          const result =
            await props.services.messageService.editCost.sendRequest({
              defaultValues: x.originalCost,
            });
          switch (result.action) {
            case "confirm":
              await props.services.mutationService.editCost(
                x.id,
                result.changes,
              );
              break;
            default:
              break;
          }
        }}
        caption={
          <>
            <div className="mb-2 font-semibold text-gray-700">
              A list of all costs associated with the selected workspace.
            </div>
            {rd.mapOrElse(
              costs,
              (view) => {
                const billingDetails = [
                  { label: "Net total", value: view.total.netAmount },
                  // { label: "Charged gross", value: view.total.grossAmount },
                  { label: "Total matched", value: view.total.matchedAmount },
                  {
                    label: "Total remaining",
                    value: view.total.remainingAmount,
                  },
                ];

                return (
                  <>
                    <h3 className="my-3 text-base font-semibold">
                      Summary ({view.entries.length} costs)
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
                  </>
                );
              },
              <div className="grid grid-flow-col gap-3">
                <Skeleton className="w-full h-10" />
                <Skeleton className="w-full h-10" />
                <Skeleton className="w-full h-10" />
              </div>,
            )}
          </>
        }
      />
    </CommonPageContainer>
  );
}