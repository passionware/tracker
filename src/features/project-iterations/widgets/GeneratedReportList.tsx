import { myRouting } from "@/routing/myRouting.ts";
import {
  generatedReportSourceQueryUtils,
  type GeneratedReportSource,
} from "@/api/generated-report-source/generated-report-source.api.ts";
import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import type { CurrencyValue } from "@/services/ExchangeService/ExchangeService.ts";
import {
  ActionMenu,
  ActionMenuCopyItem,
  ActionMenuDeleteItem,
  ActionMenuEditItem,
} from "@/features/_common/ActionMenu.tsx";
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget.tsx";
import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns.tsx";
import {
  ListToolbar,
  ListToolbarActionsMenu,
} from "@/features/_common/ListToolbar.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import {
  selectionState,
  SelectionState,
  useSelectionCleanup,
} from "@/platform/lang/SelectionState";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/routing/routingUtils.ts";
import { maybe, mt, rd } from "@passionware/monads";
import { Download, Eye, Trash2 } from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import { useState } from "react";
import { promiseState } from "@passionware/platform-react";
import { toast } from "sonner";

const columnHelper = createColumnHelper<any>();

export function GeneratedReportList(
  props: WithFrontServices & {
    projectIterationId: ProjectIteration["id"];
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
    projectId?: number;
  },
) {
  const query = generatedReportSourceQueryUtils.getBuilder().build((q) => [
    q.withFilter("projectIterationId", {
      operator: "oneOf",
      value: [props.projectIterationId],
    }),
  ]);

  const [selection, setSelection] = useState<SelectionState<number>>(
    selectionState.selectNone(),
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const generatedReports =
    props.services.generatedReportSourceService.useGeneratedReportSources(
      maybe.of(query),
    );

  useSelectionCleanup(
    selection,
    rd.tryMap(generatedReports, (r) => r.map((e) => e.id)),
    setSelection,
  );

  // Delete mutation for selected reports
  const deleteMutation = promiseState.useMutation(async () => {
    const selectedIds = selectionState.getSelectedIds(
      selection,
      rd.tryGet(generatedReports)?.map((e) => e.id) ?? [],
    );

    if (selectedIds.length === 0) {
      return;
    }

    // Delete each selected report
    for (const reportId of selectedIds) {
      await props.services.generatedReportSourceWriteService.deleteGeneratedReportSource(
        reportId,
      );
    }

    // Clear selection after successful deletion
    setSelection(selectionState.selectNone());
  });

  const selectedReportIds = selectionState.getSelectedIds(
    selection,
    rd.tryGet(generatedReports)?.map((e) => e.id) ?? [],
  );

  async function handleBatchDelete() {
    if (selectedReportIds.length === 0) return;

    try {
      await deleteMutation.track(void 0);
      toast.success(
        `Successfully deleted ${selectedReportIds.length} report(s)`,
      );
    } catch (error) {
      console.error("Error deleting reports:", error);
      toast.error("Failed to delete reports");
    }
  }

  return (
    <>
    <ListView
      data={generatedReports}
      className="w-full overflow-x-auto"
      selection={selection}
      onSelectionChange={setSelection}
      query={query}
      onQueryChange={() => {}}
      getRowId={(x) => x.id}
      onRowDoubleClick={(report) => {
        if (props.projectId) {
          props.services.navigationService.navigate(
            myRouting
              .forWorkspace(props.workspaceId)
              .forClient(props.clientId)
              .forProject(props.projectId.toString())
              .forIteration(props.projectIterationId.toString())
              .forGeneratedReport(report.id.toString())
              .root(),
          );
        }
      }}
      columns={[
        {
          accessorKey: "id",
          header: "ID",
          cell: ({ row }) => row.getValue("id"),
        },
        sharedColumns.createdAt(props.services),
        {
          accessorKey: "timeEntriesCount",
          header: "Time Entries",
          cell: ({ row }) => {
            const data = row.original.data;
            return data.timeEntries.length;
          },
        },
        {
          id: "totalBilling",
          header: "Total billing",
          cell: ({ row }) => {
            const report = row.original as GeneratedReportSource;
            let billing: CurrencyValue[] = [];
            try {
              billing =
                props.services.generatedReportViewService.getBasicInformationView(
                  report,
                ).statistics.totalBillingBudget;
            } catch {
              return <span className="text-muted-foreground">—</span>;
            }
            if (billing.length === 0) {
              return <span className="text-muted-foreground">—</span>;
            }
            return (
              <CurrencyValueWidget
                values={billing}
                services={props.services}
                exchangeService={props.services.exchangeService}
                className="text-sm"
              />
            );
          },
        },
        {
          accessorKey: "taskTypesCount",
          header: "Task Types",
          cell: ({ row }) => {
            const data = row.original.data;
            return Object.keys(data.definitions.taskTypes).length;
          },
        },
        {
          accessorKey: "activityTypesCount",
          header: "Activity Types",
          cell: ({ row }) => {
            const data = row.original.data;
            return Object.keys(data.definitions.activityTypes).length;
          },
        },
        {
          accessorKey: "roleTypesCount",
          header: "Role Types",
          cell: ({ row }) => {
            const data = row.original.data;
            return Object.keys(data.definitions.roleTypes).length;
          },
        },
        sharedColumns.description,
        columnHelper.display({
          id: "actions",
          enableHiding: false,
          cell: ({ row }) => (
            <ActionMenu services={props.services}>
              <ActionMenuDeleteItem
                onClick={() => {
                  void props.services.generatedReportSourceWriteService.deleteGeneratedReportSource(
                    row.original.id,
                  );
                }}
              >
                Delete Report
              </ActionMenuDeleteItem>
              <ActionMenuEditItem
                onClick={() => {
                  // Navigate to detail page for editing
                  if (props.projectId) {
                    props.services.navigationService.navigate(
                      myRouting
                        .forWorkspace(props.workspaceId)
                        .forClient(props.clientId)
                        .forProject(props.projectId.toString())
                        .forIteration(props.projectIterationId.toString())
                        .forGeneratedReport(row.original.id.toString())
                        .root(),
                    );
                  }
                }}
              >
                View Details
              </ActionMenuEditItem>
              <ActionMenuCopyItem copyText={row.original.id.toString()}>
                Copy Report ID
              </ActionMenuCopyItem>
            </ActionMenu>
          ),
        }),
      ]}
      caption={
        <>
          <p>A list of all generated reports for this iteration.</p>
          <p>
            These reports contain structured data imported from external sources
            like Tmetric.
          </p>
          <p>
            Each report includes time entries, task types, activity types, and
            role types with their associated rates.
          </p>
        </>
      }
      toolbar={
        <ListToolbar>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ListToolbarActionsMenu selectedCount={selectedReportIds.length}>
              <DropdownMenuItem
                disabled={selectedReportIds.length === 0}
                onSelect={() => {
                  // TODO: Implement view report details
                  console.log("View report details");
                }}
              >
                <Eye className="h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={selectedReportIds.length === 0}
                onSelect={() => {
                  // TODO: Implement export report
                  console.log("Export report");
                }}
              >
                <Download className="h-4 w-4" />
                Export Report
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructrive"
                disabled={
                  selectedReportIds.length === 0 ||
                  mt.isInProgress(deleteMutation.state)
                }
                onSelect={(e) => {
                  e.preventDefault();
                  setDeleteConfirmOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </ListToolbarActionsMenu>
          </div>
        </ListToolbar>
      }
    />
      <AlertDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected reports?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedReportIds.length}{" "}
              selected report(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={mt.isInProgress(deleteMutation.state)}
            >
              {mt.isInProgress(deleteMutation.state) ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
