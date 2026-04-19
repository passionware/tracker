import { WithFrontServices } from "@/core/frontServices.ts";
import { TimeTrackingPlaceholderPage } from "@/features/time-tracking/_common/TimeTrackingPlaceholderPage.tsx";
import type { ClientSpec, WorkspaceSpec } from "@/routing/routingUtils.ts";

export function TimeTrackingMinePage(
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
      sectionTitle="My time"
      description="The contractor-facing view of your own time entries — start/stop, fix placeholders, submit drafts for approval, and review your last week."
      todoIds={["tracker_bar_and_mine_page", "approval_workflow"]}
    />
  );
}
