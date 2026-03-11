import { IterationTriggerService } from "@/services/io/IterationTriggerService/IterationTriggerService";
import { rd } from "@passionware/monads";

/**
 * Storybook implementation of IterationTriggerService.
 * Provides stub budget target log and current target for stories that render
 * iteration detail, dashboard meter, or NewIterationPopover.
 */
export function createIterationTriggerService(): IterationTriggerService {
  return {
    getLogEntries: () => Promise.resolve([]),
    useBudgetTargetLog: () => rd.of([]),
    useCurrentBudgetTarget: () => rd.of(null),
  };
}
