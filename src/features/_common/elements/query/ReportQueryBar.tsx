import { ReportQuery, reportQueryUtils } from "@/api/reports/reports.api.ts";
import { BooleanFilterWidget } from "@/features/_common/elements/filters/BooleanFilterWidget.tsx";
import { DateFilterWidget } from "@/features/_common/elements/filters/DateFilterWidget.tsx";
import { CommonQueryBar } from "@/features/_common/elements/query/_common/CommonQueryBar.tsx";
import { QueryBarSpec } from "@/features/_common/elements/query/_common/QueryBarSpec.tsx";
import { QueryBarLayout } from "@/features/_common/elements/query/QueryBarLayout.tsx";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe } from "@passionware/monads";
import { Overwrite } from "@passionware/platform-ts";
import { ComponentProps } from "react";

export type ReportQueryBarProps = WithServices<
  [
    WithWorkspaceService,
    WithClientService,
    WithContractorService,
    WithFormatService,
  ]
> &
  Overwrite<
    ComponentProps<"div">,
    {
      query: ReportQuery;
      onQueryChange: (query: ReportQuery) => void;
      spec: QueryBarSpec;
    }
  >;

export function ReportQueryBar(props: ReportQueryBarProps) {
  function handleChange<T extends keyof ReportQuery["filters"], X>(
    key: T,
    transform: (value: X) => ReportQuery["filters"][T],
  ): (value: Nullable<X>) => void {
    return (value) =>
      props.onQueryChange(
        reportQueryUtils.setFilter(
          props.query,
          key,
          maybe.map(value, transform),
        ),
      );
  }
  return (
    <QueryBarLayout>
      <CommonQueryBar
        query={props.query}
        onQueryChange={props.onQueryChange}
        spec={props.spec}
        services={props.services}
        allowUnassigned={{
          client: false,
          contractor: false,
          workspace: false,
        }}
      />
      <DateFilterWidget
        services={props.services}
        value={props.query.filters.period}
        fieldLabel="Period"
        onUpdate={handleChange("period", maybe.getOrNull)}
      />
      <BooleanFilterWidget
        value={props.query.filters.commitState}
        fieldLabel="Commited"
        onUpdate={handleChange("commitState", maybe.getOrNull)}
      />
    </QueryBarLayout>
  );
}
