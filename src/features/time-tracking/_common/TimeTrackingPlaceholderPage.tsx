import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import type { ClientSpec, WorkspaceSpec } from "@/routing/routingUtils.ts";
import type { ReactNode } from "react";

/**
 * Shared shell for the not-yet-built Time tracking sub-pages.
 *
 * The five pages (mine, timeline, tasks, activities, approvals) are tracked
 * by their own dedicated todos. This placeholder gives us the navigable
 * routing surface today so the sidebar group + URL builders are exercised
 * end-to-end while the rich UIs are still in progress.
 */
export function TimeTrackingPlaceholderPage(
  props: WithFrontServices & {
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
    sectionTitle: string;
    description: ReactNode;
    todoIds: readonly string[];
  },
) {
  return (
    <CommonPageContainer
      segments={[
        <WorkspaceBreadcrumbLink
          workspaceId={props.workspaceId}
          services={props.services}
        />,
        <ClientBreadcrumbLink
          clientId={props.clientId}
          services={props.services}
        />,
        <BreadcrumbPage>Time tracking</BreadcrumbPage>,
        <BreadcrumbPage>{props.sectionTitle}</BreadcrumbPage>,
      ]}
    >
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Coming soon: {props.sectionTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>{props.description}</p>
          <p>
            Tracked by:{" "}
            <code className="text-xs">{props.todoIds.join(", ")}</code>
          </p>
        </CardContent>
      </Card>
    </CommonPageContainer>
  );
}
