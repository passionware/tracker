import { WithFrontServices } from "@/core/frontServices.ts";
import { TimeTrackingPlaceholderPage } from "@/features/time-tracking/_common/TimeTrackingPlaceholderPage.tsx";
import type { ClientSpec, WorkspaceSpec } from "@/routing/routingUtils.ts";

export function TimeTrackingTasksPage(
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
      sectionTitle="Tasks"
      description="Task manager with external links (Linear / GitLab / Bitbucket), assignees, estimate inline editing and the % over estimate sparkline."
      todoIds={[
        "timeline_and_tasks_pages",
        "task_and_activity_managers",
        "estimates_and_actuals",
      ]}
    />
  );
}
