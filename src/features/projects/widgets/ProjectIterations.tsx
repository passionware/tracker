import {
  ProjectIteration,
  projectIterationQueryUtils,
} from "@/api/project-iteration/project-iteration.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
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
import { maybe, mt, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { createColumnHelper } from "@tanstack/react-table";
import { capitalize } from "lodash";
import { useState } from "react";
import { toast } from "sonner";

export interface ProjectIterationsProps extends WithFrontServices {
  projectId: number;
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
}

const c = createColumnHelper<ProjectIteration>();

export function ProjectIterations(props: ProjectIterationsProps) {
  const [_query, setQuery] = useState(projectIterationQueryUtils.ofDefault());
  const statusFilter =
    props.services.locationService.useCurrentProjectIterationStatus();
  const query = projectIterationQueryUtils.transform(_query).build((q) => [
    q.withFilter("projectId", {
      operator: "oneOf",
      value: [props.projectId],
    }),
    q.withFilter(
      "status",
      maybe.map(statusFilter, (x) =>
        x === "all" // todo probably we need navigation utils same as for ClientSpec and WorkspaceSpec
          ? null
          : {
              operator: "oneOf",
              value: x === "active" ? ["active", "draft"] : [x],
            },
      ),
    ),
  ]);
  const projectIterations =
    props.services.projectIterationService.useProjectIterations(query);

  const [selection, setSelection] = useState<SelectionState<number>>(
    selectionState.selectNone(),
  );

  useSelectionCleanup(
    selection,
    rd.tryMap(projectIterations, (iterations) =>
      iterations.map((iteration) => iteration.id),
    ),
    setSelection,
  );

  const selectedIterationIds = selectionState.getSelectedIds(
    selection,
    rd.tryGet(projectIterations)?.map((iteration) => iteration.id) ?? [],
  );

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const bulkStatusChangeMutation = promiseState.useMutation(
    async (status: "draft" | "active" | "closed") => {
      if (selectedIterationIds.length === 0) return;

      // Bulk update all selected iterations' status in a single operation
      await props.services.mutationService.bulkEditProjectIteration(
        selectedIterationIds,
        { status },
      );
    },
  );

  const handleBulkStatusChange = async (
    status: "draft" | "active" | "closed",
  ) => {
    if (selectedIterationIds.length === 0) return;

    try {
      await bulkStatusChangeMutation.track(status);
      toast.success(
        `Successfully updated ${selectedIterationIds.length} iteration(s) to ${capitalize(status)}`,
      );
      // Clear selection and close dropdown after successful update
      setSelection(selectionState.selectNone());
      setDropdownOpen(false);
    } catch (error) {
      console.error("Error updating iteration status:", error);
      toast.error("Failed to update iteration status");
      // Keep dropdown open on error so user can retry
    }
  };

  return (
    <>
      <ListView
        data={projectIterations}
        query={query}
        onQueryChange={setQuery}
        selection={selection}
        onSelectionChange={setSelection}
        onRowDoubleClick={(row) => {
          props.services.navigationService.navigate(
            props.services.routingService
              .forWorkspace(props.workspaceId)
              .forClient(props.clientId)
              .forProject(props.projectId.toString())
              .forIteration(row.id.toString())
              .root(),
          );
        }}
        columns={[
          c.accessor("ordinalNumber", {
            header: "#",
            meta: {
              sortKey: "ordinalNumber",
            },
          }),
          c.display({
            header: "Range",
            cell: (cell) =>
              props.services.formatService.temporal.range.compact(
                cell.row.original.periodStart,
                cell.row.original.periodEnd,
              ),
            meta: {
              sortKey: "periodStart",
            },
          }),
          c.accessor("status", {
            header: "Status",
            cell: (info) => {
              const value = info.row.original.status;
              return (
                <Badge
                  variant={
                    (
                      {
                        draft: "secondary",
                        active: "positive",
                        closed: "destructive",
                      } as const
                    )[value]
                  }
                >
                  {capitalize(value)}
                </Badge>
              );
            },
            meta: {
              sortKey: "status",
            },
          }),
          sharedColumns.description,
        ]}
        toolbar={
          selectionState.getTotalSelected(
            selection,
            rd.tryGet(projectIterations)?.length ?? 0,
          ) > 0 ? (
            <ListToolbar>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {selectionState.getTotalSelected(
                    selection,
                    rd.tryGet(projectIterations)?.length ?? 0,
                  )}{" "}
                  selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <ListToolbarButton
                      variant="default"
                      disabled={mt.isInProgress(bulkStatusChangeMutation.state)}
                    >
                      Actions
                    </ListToolbarButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger
                        disabled={mt.isInProgress(
                          bulkStatusChangeMutation.state,
                        )}
                      >
                        Change iteration status
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem
                          onSelect={() => handleBulkStatusChange("draft")}
                          disabled={mt.isInProgress(
                            bulkStatusChangeMutation.state,
                          )}
                        >
                          {mt.isInProgress(bulkStatusChangeMutation.state)
                            ? "Updating..."
                            : "Draft"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => handleBulkStatusChange("active")}
                          disabled={mt.isInProgress(
                            bulkStatusChangeMutation.state,
                          )}
                        >
                          {mt.isInProgress(bulkStatusChangeMutation.state)
                            ? "Updating..."
                            : "Active"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => handleBulkStatusChange("closed")}
                          disabled={mt.isInProgress(
                            bulkStatusChangeMutation.state,
                          )}
                        >
                          {mt.isInProgress(bulkStatusChangeMutation.state)
                            ? "Updating..."
                            : "Closed"}
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </ListToolbar>
          ) : null
        }
      />
    </>
  );
}
