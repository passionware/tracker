import { Project } from "@/api/project/project.api.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { renderError } from "@/features/_common/renderError.tsx";
import { EventsView } from "@/features/project-iterations/widgets/EventsView.tsx";
import { rd } from "@passionware/monads";

export interface EventsWidgetProps extends WithFrontServices {
  projectIterationId: number;
  projectId: Project["id"];
}

export function EventsWidget(props: EventsWidgetProps) {
  const events =
    props.services.projectIterationDisplayService.useComputedEvents(
      props.projectIterationId,
    );

  const project = props.services.projectService.useProject(props.projectId);

  return rd
    .journey(rd.combine({ events, project }))
    .wait(<Skeleton className="h-96" />)
    .catch(renderError)
    .map(({ events, project }) => (
      <EventsView
        data={events}
        clientId={project.clientId}
        workspaceId={project.workspaceId}
        services={props.services}
      />
    ));
}
