import { billingQueryUtils } from "@/api/billing/billing.api.ts";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { BillingQueryBar } from "@/features/_common/elements/query/BillingQueryBar.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import {
  ListToolbar,
  ListToolbarButton,
} from "@/features/_common/ListToolbar.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { Summary } from "@/features/_common/Summary.tsx";
import { SummaryCurrencyGroup } from "@/features/_common/SummaryCurrencyGroup.tsx";
import { BillingForm } from "@/features/billing/BillingForm.tsx";
import { BillingWidgetProps } from "@/features/billing/BillingWidget.types.ts";
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
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useColumns } from "./BillingWidget.columns";

export function BillingWidget(props: BillingWidgetProps) {
  const queryParamsService =
    props.services.queryParamsService.forEntity("billing");
  const queryParams = queryParamsService.useQueryParams();

  const query = billingQueryUtils.ensureDefault(
    queryParams,
    props.workspaceId,
    props.clientId,
  );

  const addBillingState = promiseState.useRemoteData();

  const [selection, setSelection] = useState<SelectionState<number>>(
    selectionState.selectNone(),
  );

  // Get billings - we'll calculate selected IDs from the billings data
  const billings = props.services.reportDisplayService.useBillingView(query, undefined);

  // Calculate selected IDs from selection state and available billings
  const selectedBillingIds = useMemo(() => {
    return selectionState.getSelectedIds(
      selection,
      rd.tryGet(billings)?.entries.map((e) => e.id) ?? [],
    );
  }, [selection, billings]);

  // Get billings with selection totals if any items are selected
  const billingsWithSelection = props.services.reportDisplayService.useBillingView(
    query,
    selectedBillingIds.length > 0 ? selectedBillingIds : undefined,
  );

  // Use billings with selection totals if available, otherwise use regular billings
  const finalBillings = selectedBillingIds.length > 0 ? billingsWithSelection : billings;

  useSelectionCleanup(
    selection,
    rd.tryMap(finalBillings, (r) => r.entries.map((e) => e.id)),
    setSelection,
  );

  const deleteMutation = promiseState.useMutation(async () => {
    if (selectedBillingIds.length === 0) {
      return;
    }

    try {
      // Bulk delete all selected billings
      await props.services.mutationService.bulkDeleteBilling(
        selectedBillingIds,
      );
      // Clear selection after successful deletion
      setSelection(selectionState.selectNone());
      toast.success(
        `Successfully deleted ${selectedBillingIds.length} billing(s)`,
      );
    } catch (error) {
      console.error("Error deleting billings:", error);
      toast.error("Failed to delete billings");
    }
  });

  async function handleBatchDelete() {
    if (selectedBillingIds.length === 0) return;
    await deleteMutation.track(void 0);
  }

  const columns = useColumns(props);

  return (
    <CommonPageContainer
      tools={
        <>
          <BillingQueryBar
            {...props}
            query={query}
            onQueryChange={queryParamsService.setQueryParams}
            spec={{
              client: idSpecUtils.takeOrElse(props.clientId, "disable", "show"),
              workspace: idSpecUtils.takeOrElse(
                props.workspaceId,
                "disable",
                "show",
              ),
              contractor: "show",
            }}
          />
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
                <BillingForm
                  onCancel={bag.close}
                  defaultValues={{
                    workspaceId: idSpecUtils.switchAll(
                      props.workspaceId,
                      undefined,
                    ),
                    currency: rd.tryMap(
                      finalBillings,
                      (reports) =>
                        reports.entries[reports.entries.length - 1]?.netAmount
                          .currency,
                    ),
                    invoiceDate: dateToCalendarDate(new Date()),
                    clientId: idSpecUtils.switchAll(props.clientId, undefined),
                  }}
                  services={props.services}
                  onSubmit={(data) =>
                    addBillingState.track(
                      props.services.mutationService
                        .createBilling(data)
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
        query={query}
        onQueryChange={queryParamsService.setQueryParams}
        data={rd.map(finalBillings, (x) => x.entries)}
        selection={selection}
        onSelectionChange={setSelection}
        columns={columns}
        getRowId={(x) => x.id}
        onRowDoubleClick={async (x) => {
          const result =
            await props.services.messageService.editBilling.sendRequest({
              defaultValues: x.originalBilling,
              operatingMode: "edit",
            });
          switch (result.action) {
            case "confirm":
              await props.services.mutationService.editBilling(
                x.id,
                result.changes,
              );
              break;
          }
        }}
        toolbar={
          selectionState.getTotalSelected(
            selection,
            rd.tryGet(billings)?.entries.length ?? 0,
          ) > 0 ? (
            <ListToolbar>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {selectionState.getTotalSelected(
                    selection,
                    rd.tryGet(finalBillings)?.entries.length ?? 0,
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
                        {selectedBillingIds.length} selected billing(s)? This
                        action cannot be undone.
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
              A list of all billings for the selected client.
            </div>
            {rd.tryMap(finalBillings, (view) => {
              const totals = view.totalSelected ?? view.total;
              const selectedCount = view.totalSelected
                ? selectedBillingIds.length
                : view.entries.length;
              
              const billingDetails = [
                { label: "Charged", value: totals.netAmount },
                // { label: "Charged gross", value: totals.grossAmount },
                { label: "Reconciled", value: totals.matchedAmount },
                { label: "To reconcile", value: totals.remainingAmount },
              ];

              return (
                <div>
                  <h3 className="my-3 text-base font-semibold text-gray-900">
                    Summary ({selectedCount} {selectedCount === 1 ? "invoice" : "invoices"})
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
