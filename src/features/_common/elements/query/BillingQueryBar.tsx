import { BillingQuery, billingQueryUtils } from "@/api/billing/billing.api.ts";
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

export type BillingQueryBarProps = WithServices<
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
      query: BillingQuery;
      onQueryChange: (query: BillingQuery) => void;
      spec: QueryBarSpec;
    }
  >;

export function BillingQueryBar(props: BillingQueryBarProps) {
  function handleChange<T extends keyof BillingQuery["filters"], X>(
    key: T,
    transform: (value: X) => BillingQuery["filters"][T],
  ): (value: Nullable<X>) => void {
    return (value) =>
      props.onQueryChange(
        billingQueryUtils.setFilter(
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
          workspace: false,
          contractor: true,
        }}
      />
      <DateFilterWidget
        services={props.services}
        value={props.query.filters.invoiceDate}
        fieldLabel="Invoice date"
        onUpdate={handleChange("invoiceDate", maybe.getOrNull)}
      />
    </QueryBarLayout>
  );
}
