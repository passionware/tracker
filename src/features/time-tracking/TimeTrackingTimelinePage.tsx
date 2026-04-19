import { WithFrontServices } from "@/core/frontServices.ts";
import { TimeTrackingPlaceholderPage } from "@/features/time-tracking/_common/TimeTrackingPlaceholderPage.tsx";
import type { ClientSpec, WorkspaceSpec } from "@/routing/routingUtils.ts";

export function TimeTrackingTimelinePage(
  props: WithFrontServices & {
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  return (
    <TimeTrackingPlaceholderPage
      services={props.services}
      workspaceId={props.workspaceId}
      clientId={props.clientId}
      sectionTitle="Timeline"
      description="Cross-contractor timeline of time entries with workspace + client filters, jump-on lineage chips and placeholder badges."
      todoIds={["timeline_and_tasks_pages"]}
    />
  );
}
