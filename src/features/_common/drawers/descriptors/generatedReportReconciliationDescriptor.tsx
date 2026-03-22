import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  createErrorRenderer,
  renderSmallError,
} from "@/features/_common/renderError.tsx";
import { DrawerMainInfoGrid } from "@/features/_common/drawers/DrawerMainInfoGrid.tsx";
import { useEntityDrawerContext } from "@/features/_common/drawers/entityDrawerContext.tsx";
import { ReconciliationView } from "@/features/project-iterations/widgets/ReconciliationView.tsx";
import { maybe, rd } from "@passionware/monads";
import type {
  DrawerDescriptor,
  DrawerDescriptorServices,
} from "../DrawerDescriptor";

export type GeneratedReportReconciliationSpec = {
  type: "generated-report-reconciliation";
  reportId: number;
  projectIterationId: number;
  projectId: number;
};

function GeneratedReportReconciliationBreadcrumbLabel({
  entity,
  services,
}: {
  entity: GeneratedReportReconciliationSpec;
  services: DrawerDescriptorServices;
}) {
  const reportRd =
    services.generatedReportSourceService.useGeneratedReportSource(
      maybe.of(entity.reportId),
    );
  return rd
    .journey(reportRd)
    .wait(<Skeleton className="h-4 w-24" />)
    .catch(renderSmallError("h-4 w-24"))
    .map(() => <>Report #{entity.reportId} · Reconcile</>);
}

function GeneratedReportReconciliationSmallPreview({
  entity,
  services,
}: {
  entity: GeneratedReportReconciliationSpec;
  services: DrawerDescriptorServices;
}) {
  const reportRd =
    services.generatedReportSourceService.useGeneratedReportSource(
      maybe.of(entity.reportId),
    );
  return rd
    .journey(reportRd)
    .wait(<Skeleton className="h-12 w-48" />)
    .catch(renderSmallError("h-12 w-48"))
    .map((report) => (
      <DrawerMainInfoGrid
        items={[
          {
            label: "Time entries",
            value: String(report.data.timeEntries.length),
          },
        ]}
      />
    ));
}

function GeneratedReportReconciliationDrawerBody({
  entity,
  services,
}: {
  entity: GeneratedReportReconciliationSpec;
  services: DrawerDescriptorServices;
}) {
  const { context } = useEntityDrawerContext();
  const reportRd =
    services.generatedReportSourceService.useGeneratedReportSource(
      maybe.of(entity.reportId),
    );
  const iterationRd =
    services.projectIterationService.useProjectIterationDetail(
      maybe.of(entity.projectIterationId),
    );

  return rd
    .journey(
      rd.combine({
        report: reportRd,
        iteration: iterationRd,
      }),
    )
    .wait(
      <div className="space-y-3 p-1">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>,
    )
    .catch(createErrorRenderer("w-full max-w-md"))
    .map(({ report }) => (
      <div className="min-h-0 w-full max-w-full">
        <ReconciliationView
          report={report}
          iteration={iterationRd}
          projectIterationId={entity.projectIterationId}
          projectId={entity.projectId}
          workspaceId={context.workspaceId}
          clientId={context.clientId}
          services={services}
        />
      </div>
    ));
}

export const generatedReportReconciliationDrawerDescriptor: DrawerDescriptor<GeneratedReportReconciliationSpec> =
  {
    getKey: (entity) => `generated-report-reconciliation:${entity.reportId}`,
    getLabel: (entity) => `Reconcile #${entity.reportId}`,
    getTitle: () => "Reconciliation",
    renderBreadcrumbLabel: (entity, services) => (
      <GeneratedReportReconciliationBreadcrumbLabel
        entity={entity}
        services={services}
      />
    ),
    renderSmallPreview: (entity, services) => (
      <GeneratedReportReconciliationSmallPreview
        entity={entity}
        services={services}
      />
    ),
    renderDrawerContent: (entity, services) => (
      <GeneratedReportReconciliationDrawerBody
        entity={entity}
        services={services}
      />
    ),
  };
