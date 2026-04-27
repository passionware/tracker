import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { billingQueryUtils } from "@/api/billing/billing.api.ts";
import { reportQueryUtils } from "@/api/reports/reports.api.ts";
import { workspaceQueryUtils } from "@/api/workspace/workspace.api.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import { BillingList } from "@/features/_common/elements/lists/BillingList.tsx";
import { useEntityDrawerContext } from "@/features/_common/drawers/entityDrawerContext.tsx";
import { billingIdsLinkedToIterationReports } from "@/features/project-iterations/widgets/iterationLinkedBillingIds.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { expressionContextUtils } from "@/services/front/ExpressionService/ExpressionService.ts";
import { calculateBilling } from "@/services/front/ReportDisplayService/_private/billing.ts";
import { ClientSpec, WorkspaceSpec } from "@/routing/routingUtils.ts";
import { maybe, rd } from "@passionware/monads";
import { useMemo, useState } from "react";

export function LinkedBillingList(
  props: WithFrontServices & {
    projectIterationId: ProjectIteration["id"];
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  const { openEntityDrawer } = useEntityDrawerContext();
  const [billingListQuery, setBillingListQuery] = useState(() =>
    billingQueryUtils.ofDefault(props.workspaceId, props.clientId),
  );

  const reportQuery = useMemo(
    () =>
      reportQueryUtils
        .getBuilder(props.workspaceId, props.clientId)
        .build((q) => [
          q.withFilter("projectIterationId", {
            operator: "oneOf",
            value: [props.projectIterationId],
          }),
        ]),
    [props.workspaceId, props.clientId, props.projectIterationId],
  );

  const reports =
    props.services.reportDisplayService.useReportView(reportQuery);

  const billingIdsMaybe = useMemo(() => {
    if (!rd.isSuccess(reports)) {
      return maybe.ofAbsent();
    }
    return maybe.of(billingIdsLinkedToIterationReports(reports.data.entries));
  }, [reports]);

  const billings =
    props.services.billingService.useBillingsByIds(billingIdsMaybe);

  const workspaces = props.services.workspaceService.useWorkspaces(
    workspaceQueryUtils.ofEmpty(),
  );

  const rowsRd = rd.useMemoMap(
    rd.combine({ reports, billings, workspaces }),
    ({ billings: billingList, workspaces: ws }) => {
      const rows = billingList.map((b) => calculateBilling(b, ws));
      rows.sort((a, b) => {
        const wa = a.originalBilling.workspaceId;
        const wb = b.originalBilling.workspaceId;
        if (wa !== wb) return wa - wb;
        const byDate = a.invoiceDate.compare(b.invoiceDate);
        if (byDate !== 0) return byDate;
        return a.id - b.id;
      });
      return rows;
    },
  );

  const billingContext = useMemo(
    () =>
      expressionContextUtils
        .ofGlobal()
        .setWorkspace(props.workspaceId)
        .setClient(props.clientId)
        .setContractor(idSpecUtils.ofAll())
        .build(),
    [props.workspaceId, props.clientId],
  );

  return (
    <BillingList
      services={props.services}
      context={billingContext}
      data={rowsRd}
      query={billingListQuery}
      onQueryChange={setBillingListQuery}
      onRowClick={(row) => openEntityDrawer({ type: "billing", id: row.id })}
      caption={<p>Invoices linked to this iteration’s reports</p>}
    />
  );
}
