import { generatedReportSourceQueryUtils } from "@/api/generated-report-source/generated-report-source.api.ts";
import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import {
  ActionMenu,
  ActionMenuCopyItem,
  ActionMenuDeleteItem,
  ActionMenuEditItem,
} from "@/features/_common/ActionMenu.tsx";
import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns.tsx";
import {
  ListToolbar,
  ListToolbarButton,
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
} from "@/services/front/RoutingService/RoutingService.ts";
import { maybe, rd } from "@passionware/monads";
import { createColumnHelper } from "@tanstack/react-table";
import { useState } from "react";

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

  const generatedReports =
    props.services.generatedReportSourceService.useGeneratedReportSources(
      maybe.of(query),
    );

  useSelectionCleanup(
    selection,
    rd.tryMap(generatedReports, (r) => r.map((e) => e.id)),
    setSelection,
  );

  return (
    <ListView
      data={generatedReports}
      className="w-full overflow-x-auto"
      selection={selection}
      onSelectionChange={setSelection}
      query={query}
      onQueryChange={() => {}}
      onRowDoubleClick={(report) => {
        if (props.projectId) {
          props.services.navigationService.navigate(
            props.services.routingService
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
                      props.services.routingService
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
        selectionState.getTotalSelected(
          selection,
          rd.tryGet(generatedReports)?.length ?? 0,
        ) > 0 ? (
          <ListToolbar>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {selectionState.getTotalSelected(
                  selection,
                  rd.tryGet(generatedReports)?.length ?? 0,
                )}{" "}
                selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <ListToolbarButton variant="destructive">
                Delete
              </ListToolbarButton>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <ListToolbarButton variant="default">
                    Actions
                  </ListToolbarButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      // TODO: Implement view report details
                      console.log("View report details");
                    }}
                  >
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      // TODO: Implement export report
                      console.log("Export report");
                    }}
                  >
                    Export Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </ListToolbar>
        ) : null
      }
    />
  );
}
