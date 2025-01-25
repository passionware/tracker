import { CostQuery, costQueryUtils } from "@/api/cost/cost.api.ts";
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

export type CostQueryBarProps = WithServices<
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
      query: CostQuery;
      onQueryChange: (query: CostQuery) => void;
      spec: QueryBarSpec;
    }
  >;

export function CostQueryBar(props: CostQueryBarProps) {
  function handleChange<T extends keyof CostQuery["filters"], X>(
    key: T,
    transform: (value: X) => CostQuery["filters"][T],
  ): (value: Nullable<X>) => void {
    return (value) =>
      props.onQueryChange(
        costQueryUtils.setFilter(props.query, key, maybe.map(value, transform)),
      );
  }
  return (
    <QueryBarLayout>
      <CommonQueryBar
        allowUnassigned={{
          client: false,
          contractor: false,
          workspace: false,
        }}
        query={props.query}
        onQueryChange={props.onQueryChange}
        spec={props.spec}
        services={props.services}
      />
      <DateFilterWidget
        services={props.services}
        value={props.query.filters.invoiceDate}
        fieldLabel="Period"
        onUpdate={handleChange("invoiceDate", maybe.getOrNull)}
      />
    </QueryBarLayout>
  );
}
