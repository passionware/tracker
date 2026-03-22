import { myRouting } from "@/routing/myRouting.ts";
import {
  type ProjectIteration,
  type ProjectIterationPayload,
} from "@/api/project-iteration/project-iteration.api.ts";
import { Project } from "@/api/project/project.api.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import {
  ActionMenu,
  ActionMenuDeleteItem,
  ActionMenuEditItem,
} from "@/features/_common/ActionMenu.tsx";
import { useEntityDrawerContext } from "@/features/_common/drawers/entityDrawerContext.tsx";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/routing/routingUtils.ts";
import { rd } from "@passionware/monads";

function iterationPayloadDefaults(
  iter: ProjectIterationPayload & { id: ProjectIteration["id"] },
): ProjectIterationPayload {
  return {
    periodStart: iter.periodStart,
    periodEnd: iter.periodEnd,
    status: iter.status,
    description: iter.description,
    projectId: iter.projectId,
    ordinalNumber: iter.ordinalNumber,
    currency: iter.currency,
  };
}

export function ProjectIterationDetailActionMenu(
  props: WithFrontServices & {
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
    projectId: Project["id"];
    projectIterationId: ProjectIteration["id"];
    className?: string;
    /** If set, called after successful delete instead of navigating to the iterations list. */
    onAfterDelete?: () => void;
  },
) {
  const { pushEntityDrawer } = useEntityDrawerContext();
  const iteration =
    props.services.projectIterationService.useProjectIterationDetail(
      props.projectIterationId,
    );
  return (
    <ActionMenu services={props.services} className={props.className}>
      {rd.tryMap(iteration, (iter) => (
        <>
          <ActionMenuDeleteItem
            onClick={async () => {
              await props.services.mutationService.deleteProjectIteration(
                iter.id,
              );
              if (props.onAfterDelete) {
                props.onAfterDelete();
              } else {
                props.services.navigationService.navigate(
                  myRouting
                    .forWorkspace(props.workspaceId)
                    .forClient(props.clientId)
                    .forProject(props.projectId.toString())
                    .iterations("active"),
                );
              }
            }}
          >
            Delete iteration
          </ActionMenuDeleteItem>
          <ActionMenuEditItem
            onClick={() =>
              pushEntityDrawer({
                type: "project-iteration-form",
                projectIterationId: iter.id,
                defaultValues: iterationPayloadDefaults(iter),
              })
            }
          >
            Edit iteration
          </ActionMenuEditItem>
        </>
      ))}
    </ActionMenu>
  );
}
