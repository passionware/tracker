import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { Project } from "@/api/project/project.api.ts";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { renderError } from "@/features/_common/renderError.tsx";
import { ProjectIterationDetailActionMenu } from "@/features/project-iterations/widgets/ProjectIterationDetailActionMenu.tsx";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/routing/routingUtils.ts";
import { rd } from "@passionware/monads";

export function Details(
  props: WithFrontServices & {
    projectIterationId: ProjectIteration["id"];
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
    projectId: Project["id"];
  },
) {
  const iteration =
    props.services.projectIterationService.useProjectIterationDetail(
      props.projectIterationId,
    );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-row">
          <div>Project iteration</div>
          <ProjectIterationDetailActionMenu
            services={props.services}
            workspaceId={props.workspaceId}
            clientId={props.clientId}
            projectId={props.projectId}
            projectIterationId={props.projectIterationId}
            className="ml-auto"
          />
        </CardTitle>
        <CardDescription>
          {rd
            .journey(iteration)
            .wait(<Skeleton className="h-lh w-30" />)
            .catch(renderError)
            .map((iteration) => (
              <>
                <p>{iteration.description}</p>
                <p className="mt-2">
                  <strong>Currency: </strong>
                  <span className="font-semibold text-sky-700">
                    {iteration.currency.toUpperCase()} (
                    {props.services.formatService.financial.currencySymbol(
                      iteration.currency,
                    )}
                    )
                  </span>
                </p>
              </>
            ))}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
