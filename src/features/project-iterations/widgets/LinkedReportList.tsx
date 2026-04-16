import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { reportQueryUtils } from "@/api/reports/reports.api.ts";
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
import {
  ActionMenu,
  ActionMenuCopyItem,
} from "@/features/_common/ActionMenu.tsx";
import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns.tsx";
import { reportColumns } from "@/features/_common/columns/report.tsx";
import { useEntityDrawerContext } from "@/features/_common/drawers/entityDrawerContext.tsx";
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
import type { ReportViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { mt, rd } from "@passionware/monads";
import { createColumnHelper } from "@tanstack/react-table";
import { FileText, Unlink, Wallet } from "lucide-react";
import { promiseState } from "@passionware/platform-react";
import { useState } from "react";
import { ReportGenerationWidget } from "./report-generation/tmetric/ReportGenerationWidget";
import { uniqBy } from "lodash";

const linkedReportActionsColumnHelper = createColumnHelper<ReportViewEntry>();

function LinkedReportRowActionsMenu(props: {
  services: WithFrontServices["services"];
  reportId: number;
}) {
  const { pushEntityDrawer } = useEntityDrawerContext();
  return (
    <ActionMenu services={props.services}>
      <DropdownMenuItem
        onClick={() =>
          pushEntityDrawer({
            type: "bulk-create-cost-for-reports",
            reportIds: [props.reportId],
          })
        }
      >
        <Wallet className="h-4 w-4" />
        Create cost
      </DropdownMenuItem>
      <ActionMenuCopyItem copyText={String(props.reportId)}>
        Copy report ID
      </ActionMenuCopyItem>
    </ActionMenu>
  );
}

export function LinkedReportList(
  props: WithFrontServices & {
    projectIterationId: ProjectIteration["id"];
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  const { openEntityDrawer } = useEntityDrawerContext();
  const query = reportQueryUtils
    .getBuilder(props.workspaceId, props.clientId)
    .build((q) => [
      q.withFilter("projectIterationId", {
        operator: "oneOf",
        value: [props.projectIterationId],
      }),
    ]);
  const [selection, setSelection] = useState<SelectionState<number>>(
    selectionState.selectNone(),
  );
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);
  const reports = props.services.reportDisplayService.useReportView(query);
  const iteration =
    props.services.projectIterationService.useProjectIterationDetail(
      props.projectIterationId,
    );
  useSelectionCleanup(
    selection,
    rd.tryMap(reports, (r) => r.entries.map((e) => e.id)),
    setSelection,
  );

  const unlinkMutation = promiseState.useMutation(async () => {
    const ids = selectionState.getSelectedIds(
      selection,
      rd.tryGet(reports)?.entries.map((e) => e.id) ?? [],
    );
    for (const reportId of ids) {
      await props.services.mutationService.editReport(reportId, {
        projectIterationId: null,
      });
    }
    setSelection(selectionState.selectNone());
  });
  const selectedReportIds = selectionState.getSelectedIds(
    selection,
    rd.tryGet(reports)?.entries.map((e) => e.id) ?? [],
  );

  async function handleBatchUnlink() {
    if (selectedReportIds.length === 0) return;
    await unlinkMutation.track(void 0);
  }

  return (
    <>
    <ListView
      data={rd.map(reports, (r) => r.entries)}
      selection={selection}
      onSelectionChange={setSelection}
      query={query}
      onQueryChange={() => {}}
      getRowId={(x) => x.id}
      onRowClick={(row) => openEntityDrawer({ type: "report", id: row.id })}
      columns={[
        reportColumns.contractor.withAdjacency,
        reportColumns.billing.linkingStatus.read(props.services),
        reportColumns.cost.immediateLinkingStatus.read(props.services),
        reportColumns.cost.linkingStatus.read,
        reportColumns.netAmount(props.services),
        reportColumns.billing.linkedValue(props.services),
        reportColumns.billing.remainingValue(props.services),
        reportColumns.cost.immediateRemainingValue(props.services),
        reportColumns.cost.remainingValue(props.services),
        reportColumns.cost.linkedValue(props.services),
        reportColumns.period(props.services),
        sharedColumns.description,
        linkedReportActionsColumnHelper.display({
          id: "actions",
          enableHiding: false,
          cell: ({ row }) => (
            <LinkedReportRowActionsMenu
              services={props.services}
              reportId={row.original.id}
            />
          ),
        }),
      ]}
      caption={
        <>
          <p>A list of all reported work for this iteration.</p>
          <p>
            The goal is to link these reports to positions in the iteration.
          </p>
          <p>
            It can happen that not all reports are fully linked to positions, so
            we create a debt that needs to be resolved later.
          </p>
        </>
      }
      toolbar={
        <ListToolbar>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ListToolbarActionsMenu
              selectedCount={selectedReportIds.length}
              contentClassName="min-w-[11rem]"
            >
              <DropdownMenuItem
                disabled={selectedReportIds.length === 0}
                onSelect={() =>
                  openEntityDrawer({
                    type: "bulk-create-cost-for-reports",
                    reportIds: selectedReportIds,
                    afterCreate: () =>
                      setSelection(selectionState.selectNone()),
                  })
                }
              >
                <Wallet className="h-4 w-4" />
                Create cost for selected
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={selectedReportIds.length === 0}
                onSelect={() => {
                  if (!rd.isSuccess(reports)) return;
                  if (!rd.isSuccess(iteration)) return;

                  const selectedReports = reports.data.entries.filter((e) =>
                    selectionState.isSelected(selection, e.id),
                  );

                  const contractors = uniqBy(
                    selectedReports.map((e) => e.originalReport.contractor),
                    (c) => c.id,
                  );

                  props.services.dialogService.show((api) => {
                    return (
                      <ReportGenerationWidget
                        {...api}
                        contractors={contractors}
                        periodStart={iteration.data.periodStart}
                        periodEnd={iteration.data.periodEnd}
                        projectIterationId={props.projectIterationId}
                        clientId={props.clientId}
                        services={props.services}
                      />
                    );
                  });
                }}
              >
                <FileText className="h-4 w-4" />
                Generate Detailed Report
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructrive"
                disabled={
                  selectedReportIds.length === 0 ||
                  mt.isInProgress(unlinkMutation.state)
                }
                onSelect={(e) => {
                  e.preventDefault();
                  setUnlinkConfirmOpen(true);
                }}
              >
                <Unlink className="h-4 w-4" />
                Unlink from iteration
              </DropdownMenuItem>
            </ListToolbarActionsMenu>
          </div>
        </ListToolbar>
      }
    />
      <AlertDialog
        open={unlinkConfirmOpen}
        onOpenChange={setUnlinkConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink reports from iteration?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink {selectedReportIds.length}{" "}
              selected report(s) from this iteration?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchUnlink}
              disabled={mt.isInProgress(unlinkMutation.state)}
            >
              {mt.isInProgress(unlinkMutation.state)
                ? "Unlinking..."
                : "Unlink"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
