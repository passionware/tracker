import type { WithFrontServices } from "@/core/frontServices.ts";
import { useSimpleStore } from "@passionware/simple-store";

/**
 * Reactive subscription to {@link EventQueueService.state}. The queue
 * service exposes a `SimpleStore`; everything UI-facing in this feature
 * funnels through this hook so React-render dependencies stay obvious in
 * one place (and so future tests can swap the store cheaply).
 */
export function useEventQueueState(props: WithFrontServices) {
  return useSimpleStore(props.services.eventQueueService.state);
}
