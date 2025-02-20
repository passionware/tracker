import { Badge } from "@/components/ui/badge.tsx";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { rd } from "@passionware/monads";

export function ProjectIterationBreadcrumb(props: WithFrontServices) {
  const currentIteration =
    props.services.locationService.useCurrentProjectIterationId();
  const iteration =
    props.services.projectIterationService.useProjectIterationDetail(
      currentIteration,
    );
  return (
    <BreadcrumbPage>
      {rd
        .journey(iteration)
        .wait(<Skeleton className="w-20 h-4" />)
        .catch(renderSmallError("w-20 h-4"))
        .map((x) => (
          <div className="flex items-center space-x-2">
            <div>Iteration</div>
            <Badge
              variant={
                (
                  {
                    draft: "secondary",
                    active: "positive",
                    closed: "destructive",
                  } as const
                )[x.status]
              }
            >
              {x.ordinalNumber}.
            </Badge>
            {props.services.formatService.temporal.range.long(
              x.periodStart,
              x.periodEnd,
            )}
          </div>
        ))}
    </BreadcrumbPage>
  );
}
