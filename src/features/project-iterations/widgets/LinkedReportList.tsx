import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { reportQueryUtils } from "@/api/reports/reports.api.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns.tsx";
import { reportColumns } from "@/features/_common/columns/report.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { selectionState, SelectionState } from "@/platform/lang/SelectionState";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { rd } from "@passionware/monads";
import { useState } from "react";

export function LinkedReportList(
  props: WithFrontServices & {
    projectIterationId: ProjectIteration["id"];
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  const query = reportQueryUtils
    .getBuilder(props.workspaceId, props.clientId)
    .build((q) => [
      q.withFilter("projectIterationId", {
        operator: "oneOf",
        value: [props.projectIterationId],
      }),
    ]);
  const [selection, setSelection] = useState<SelectionState<number>>(
    selectionState.selectNone(),
  );
  const reports = props.services.reportDisplayService.useReportView(query);

  return (
    <ListView
      data={rd.map(reports, (r) => r.entries)}
      selection={selection}
      onSelectionChange={setSelection}
      query={query}
      onQueryChange={() => {}}
      columns={[
        reportColumns.contractor.withAdjacency,
        reportColumns.billing.linkingStatus.read(props.services),
        reportColumns.cost.immediateLinkingStatus.read(props.services),
        reportColumns.cost.linkingStatus.read,
        reportColumns.netAmount(props.services),
        reportColumns.billing.linkedValue(props.services),
        reportColumns.billing.remainingValue(props.services),
        reportColumns.cost.immediateRemainingValue(props.services),
        reportColumns.cost.remainingValue(props.services),
        reportColumns.cost.linkedValue(props.services),
        reportColumns.period(props.services),
        sharedColumns.description,
      ]}
      caption={
        <>
          <p>A list of all reported work for this iteration.</p>
          <p>
            The goal is to link these reports to positions in the iteration.
          </p>
          <p>
            It can happen that not all reports are fully linked to positions, so
            we create a debt that needs to be resolved later.
          </p>
        </>
      }
    />
  );
}
