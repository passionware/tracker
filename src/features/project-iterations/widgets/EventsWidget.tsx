import { ProjectIterationDetail } from "@/api/project-iteration/project-iteration.api.ts";
import { Project } from "@/api/project/project.api.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { renderError } from "@/features/_common/renderError.tsx";
import {
  EventsView,
  EventsViewProps,
} from "@/features/project-iterations/widgets/EventsView.tsx";
import { UpdateAction } from "@/services/front/ProjectIterationDisplayService/ProjectIterationDisplayService";
import { rd } from "@passionware/monads";
import { useMemo, useState } from "react";

export interface EventsWidgetProps extends WithFrontServices {
  projectIterationId: number;
  projectId: Project["id"];
}

export function EventsWidget(props: EventsWidgetProps) {
  const iteration =
    props.services.projectIterationService.useProjectIterationDetail(
      props.projectIterationId,
    );

  const project = props.services.projectService.useProject(props.projectId);

  return rd
    .journey(rd.combine({ iteration, project }))
    .wait(<Skeleton className="h-96" />)
    .catch(renderError)
    .map(({ iteration, project }) => (
      <StatefulEventsWidget
        iteration={iteration}
        clientId={project.clientId}
        workspaceId={project.workspaceId}
        services={props.services}
      />
    ));
}

function StatefulEventsWidget(
  props: Omit<EventsViewProps, "onAction" | "data"> & {
    iteration: ProjectIterationDetail;
  },
) {
  const [actions, setActions] = useState<UpdateAction[]>([]);
  const addAction = (action: UpdateAction) => setActions([...actions, action]);

  const events = useMemo(() => {
    const reducedDetail = actions.reduce(
      props.services.projectIterationDisplayService.updateDetail,
      props.iteration,
    );
    return props.services.projectIterationDisplayService.getComputedEvents(
      reducedDetail,
    );
  }, [actions, props.iteration]);

  return <EventsView {...props} data={events} onAction={addAction} />;
}
