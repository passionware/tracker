import { VariableQuery } from "@/api/variable/variable.api.ts";
import { CommonQueryBar } from "@/features/_common/elements/query/_common/CommonQueryBar.tsx";
import { QueryBarSpec } from "@/features/_common/elements/query/_common/QueryBarSpec.tsx";
import { QueryBarLayout } from "@/features/_common/elements/query/QueryBarLayout.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { Overwrite } from "@passionware/platform-ts";
import { ComponentProps } from "react";

export type VariableQueryBarProps = WithServices<
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
      query: VariableQuery;
      onQueryChange: (query: VariableQuery) => void;
      spec: QueryBarSpec;
    }
  >;

export function VariableQueryBar(props: VariableQueryBarProps) {
  return (
    <QueryBarLayout>
      <CommonQueryBar
        query={props.query}
        onQueryChange={props.onQueryChange}
        spec={props.spec}
        services={props.services}
      />
    </QueryBarLayout>
  );
}
