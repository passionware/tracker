import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { renderError } from "@/features/_common/renderError.tsx";
import { ComputedEventData } from "@/services/front/ProjectIterationDisplayService/ProjectIterationDisplayService.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { rd } from "@passionware/monads";

export interface EventsWidgetProps extends WithFrontServices {
  projectIterationId: number;
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
}

export function EventsWidget(props: EventsWidgetProps) {
  const events =
    props.services.projectIterationDisplayService.useComputedEvents(
      props.projectIterationId,
    );

  return rd
    .journey(events)
    .wait(<Skeleton className="h-96" />)
    .catch(renderError)
    .map((events) => <EventsView data={events} />);
}

export function EventsView(props: { data: ComputedEventData }) {
  return <div>{JSON.stringify(props.data)}</div>;
}
