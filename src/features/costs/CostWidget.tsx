import { costQueryUtils } from "@/api/cost/cost.api.ts";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { CostQueryBar } from "@/features/_common/elements/query/CostQueryBar.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import {
  ListToolbar,
  ListToolbarButton,
} from "@/features/_common/ListToolbar.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { Summary } from "@/features/_common/Summary.tsx";
import { SummaryCurrencyGroup } from "@/features/_common/SummaryCurrencyGroup.tsx";
import { CostForm } from "@/features/costs/CostForm.tsx";
import { useColumns } from "@/features/costs/CostWidget.columns.tsx";
import { PotentialCostWidgetProps } from "@/features/costs/CostWidget.types.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import {
  SelectionState,
  selectionState,
  useSelectionCleanup,
} from "@/platform/lang/SelectionState.ts";
import { dateToCalendarDate } from "@/platform/lang/internationalized-date";
import { mt, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Check, Loader2, PlusCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function CostWidget(props: PotentialCostWidgetProps) {
  const queryParamsService =
    props.services.queryParamsService.forEntity("costs");
  const queryParams = queryParamsService.useQueryParams();

  const query = costQueryUtils.ensureDefault(
    queryParams,
    props.workspaceId,
    props.clientId,
  );
  const costs = props.services.reportDisplayService.useCostView(query);

  const addCostState = promiseState.useRemoteData<void>();

  const [selection, setSelection] = useState<SelectionState<number>>(
    selectionState.selectNone(),
  );

  useSelectionCleanup(
    selection,
    rd.tryMap(costs, (r) => r.entries.map((e) => e.id)),
    setSelection,
  );

  const selectedCostIds = selectionState.getSelectedIds(
    selection,
    rd.tryGet(costs)?.entries.map((e) => e.id) ?? [],
  );

  const deleteMutation = promiseState.useMutation(async () => {
    if (selectedCostIds.length === 0) {
      return;
    }

    try {
      // Bulk delete all selected costs
      await props.services.mutationService.bulkDeleteCost(selectedCostIds);
      // Clear selection after successful deletion
      setSelection(selectionState.selectNone());
      toast.success(`Successfully deleted ${selectedCostIds.length} cost(s)`);
    } catch (error) {
      console.error("Error deleting costs:", error);
      toast.error("Failed to delete costs");
    }
  });

  async function handleBatchDelete() {
    if (selectedCostIds.length === 0) return;
    await deleteMutation.track(void 0);
  }

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
          <CostQueryBar
            services={props.services}
            query={query}
            onQueryChange={queryParamsService.setQueryParams}
            spec={{
              workspace: idSpecUtils.takeOrElse(
                props.workspaceId,
                "disable",
                "show",
              ),
              client: idSpecUtils.takeOrElse(props.clientId, "disable", "show"),
              contractor: "show",
            }}
          />
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
                    invoiceDate: dateToCalendarDate(new Date()),
                    contractorId: query.filters.contractorId?.value[0],
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
        query={query}
        onQueryChange={queryParamsService.setQueryParams}
        data={rd.map(costs, (x) => x.entries)}
        selection={selection}
        onSelectionChange={setSelection}
        columns={columns}
        onRowDoubleClick={async (x) => {
          const result =
            await props.services.messageService.editCost.sendRequest({
              defaultValues: x.originalCost,
              operatingMode: "edit",
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
        toolbar={
          selectionState.getTotalSelected(
            selection,
            rd.tryGet(costs)?.entries.length ?? 0,
          ) > 0 ? (
            <ListToolbar>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {selectionState.getTotalSelected(
                    selection,
                    rd.tryGet(costs)?.entries.length ?? 0,
                  )}{" "}
                  selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <div>
                      <ListToolbarButton variant="destructive">
                        Delete
                      </ListToolbarButton>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4" align="start">
                    <div className="space-y-3">
                      <div className="text-sm text-slate-700">
                        Are you sure you want to delete{" "}
                        {selectedCostIds.length} selected cost(s)? This action
                        cannot be undone.
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm">
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleBatchDelete}
                          disabled={mt.isInProgress(deleteMutation.state)}
                        >
                          {mt.isInProgress(deleteMutation.state)
                            ? "Deleting..."
                            : "Confirm"}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </ListToolbar>
          ) : undefined
        }
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
