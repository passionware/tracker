import { WithFrontServices } from "@/core/frontServices.ts";
import { TimeTrackingPlaceholderPage } from "@/features/time-tracking/_common/TimeTrackingPlaceholderPage.tsx";
import type { ClientSpec, WorkspaceSpec } from "@/routing/routingUtils.ts";

export function TimeTrackingActivitiesPage(
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
      sectionTitle="Activities"
      description="Project-scoped activity definitions and their kinds (development, meeting, code_review, jump_on…)."
      todoIds={["task_and_activity_managers", "jump_on_mode"]}
    />
  );
}
