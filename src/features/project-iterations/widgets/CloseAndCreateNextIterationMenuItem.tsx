import {
  projectIterationQueryUtils,
  type ProjectIteration,
} from "@/api/project-iteration/project-iteration.api.ts";
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
import { DropdownMenuItem } from "@/components/ui/dropdown-menu.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import {
  closeAndCreateNextProjectIteration,
  CloseAndCreateNextIterationError,
} from "@/features/project-iterations/closeAndCreateNextProjectIteration.ts";
import { isLatestIterationOnProject } from "@/features/project-iterations/isLatestIterationOnProject.ts";
import { suggestNextIterationPeriod } from "@/features/project-iterations/suggestNextIterationPeriod.ts";
import { useEntityDrawerContext } from "@/features/_common/drawers/entityDrawerContext.tsx";
import { myRouting } from "@/routing/myRouting.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/routing/routingUtils.ts";
import type { CalendarDate } from "@internationalized/date";
import { mt, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { CalendarSync } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export interface CloseAndCreateNextIterationMenuItemProps
  extends WithFrontServices {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  iteration: ProjectIteration;
  /** Optional client invoice dates to reinforce monthly cadence heuristics. */
  invoiceDates?: readonly CalendarDate[];
  /** Replaces default navigate + close drawer after success. */
  onSuccess?: (newIterationId: ProjectIteration["id"]) => void;
  /** Visible label in the menu. */
  label?: string;
  className?: string;
}

export function CloseAndCreateNextIterationMenuItem(
  props: CloseAndCreateNextIterationMenuItemProps,
) {
  const { services, iteration, workspaceId, clientId } = props;
  const label = props.label ?? "Close and create next";
  const { closeEntityDrawer } = useEntityDrawerContext();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const iterationsQuery = useMemo(
    () =>
      projectIterationQueryUtils.getBuilder().build((q) => [
        q.withFilter("projectId", {
          operator: "oneOf",
          value: [iteration.projectId],
        }),
        (q2) => ({
          ...q2,
          page: { page: 0, pageSize: 500 },
        }),
      ]),
    [iteration.projectId],
  );

  const projectIterationsRd =
    services.projectIterationService.useProjectIterations(iterationsQuery);

  const preview = useMemo(
    () =>
      suggestNextIterationPeriod({
        periodStart: iteration.periodStart,
        periodEnd: iteration.periodEnd,
        invoiceDates: props.invoiceDates,
      }),
    [
      iteration.periodEnd,
      iteration.periodStart,
      props.invoiceDates,
    ],
  );

  const disabledReason = useMemo(() => {
    if (iteration.status === "closed") {
      return "This iteration is already closed.";
    }
    if (!rd.isSuccess(projectIterationsRd)) {
      return "Loading iterations…";
    }
    if (!isLatestIterationOnProject(projectIterationsRd.data, iteration)) {
      return "Only the latest iteration on this project can be closed this way.";
    }
    return null;
  }, [iteration, projectIterationsRd]);

  const mutation = promiseState.useMutation(async () => {
    if (!rd.isSuccess(projectIterationsRd)) return;
    try {
      const { newIterationId } = await closeAndCreateNextProjectIteration({
        mutationService: services.mutationService,
        iterationTriggerService: services.iterationTriggerService,
        projectIterations: projectIterationsRd.data,
        iteration,
        invoiceDates: props.invoiceDates,
      });
      toast.success("Closed iteration and created the next one.");
      setConfirmOpen(false);
      if (props.onSuccess) {
        props.onSuccess(newIterationId);
      } else {
        closeEntityDrawer();
        services.navigationService.navigate(
          myRouting
            .forWorkspace(workspaceId)
            .forClient(clientId)
            .forProject(iteration.projectId.toString())
            .forIteration(newIterationId.toString())
            .root(),
        );
      }
    } catch (e) {
      const message =
        e instanceof CloseAndCreateNextIterationError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not close and create the next iteration.";
      toast.error(message);
    }
  });

  const busy = mt.isInProgress(mutation.state);
  const disabled = disabledReason != null || busy;

  return (
    <>
      <DropdownMenuItem
        className={props.className}
        disabled={disabled}
        title={disabledReason ?? undefined}
        onSelect={(event) => {
          event.preventDefault();
          if (!disabled) setConfirmOpen(true);
        }}
      >
        <CalendarSync className="size-4" />
        {label}
      </DropdownMenuItem>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent data-vaul-no-drag>
          <AlertDialogHeader>
            <AlertDialogTitle>Close iteration and create the next?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  The current iteration will be marked closed, and a new active
                  iteration will be created with the next ordinal and dates
                  suggested from this period and billing patterns.
                </p>
                <p>
                  <span className="font-medium text-foreground">Suggested range:</span>{" "}
                  {services.formatService.temporal.range.long(
                    preview.periodStart,
                    preview.periodEnd,
                  )}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || !rd.isSuccess(projectIterationsRd)}
              onClick={() => void mutation.track(void 0)}
            >
              {busy ? "Working…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
