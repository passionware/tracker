import { WithFrontServices } from "@/core/frontServices.ts";
import { TimeTrackingPlaceholderPage } from "@/features/time-tracking/_common/TimeTrackingPlaceholderPage.tsx";
import type { ClientSpec, WorkspaceSpec } from "@/routing/routingUtils.ts";

export function TimeTrackingApprovalsPage(
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
      sectionTitle="Approvals"
      description="Project-admin queue for entries submitted for approval — approve / reject with reason, gated by the project_admin role."
      todoIds={["approval_workflow"]}
    />
  );
}
