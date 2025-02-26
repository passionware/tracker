import { unassignedUtils } from "@/api/_common/query/filters/Unassigned.ts";
import {
  Contractor,
  ContractorQuery,
  contractorQueryUtils,
} from "@/api/contractor/contractor.api.ts";
import { AbstractMultiPicker } from "@/features/_common/elements/pickers/_common/AbstractMultiPicker.tsx";
import { AbstractPicker } from "@/features/_common/elements/pickers/_common/AbstractPicker.tsx";
import { ContractorView } from "@/features/_common/elements/pickers/ContractorView.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { rd } from "@passionware/monads";
import { injectConfig } from "@passionware/platform-react";
import { ComponentProps } from "react";

export type ContractorPickerProps = ComponentProps<typeof ContractorPicker>;

export const ContractorPicker = injectConfig(
  AbstractPicker<Contractor["id"], Contractor>,
)
  .fromProps<
    WithServices<[WithContractorService]> & { query?: ContractorQuery }
  >((api) => ({
    renderItem: (item, props) => (
      <ContractorView
        layout={props.layout}
        size={props.size}
        contractor={unassignedUtils.mapOrElse(item, rd.of, rd.ofIdle())}
      />
    ),
    renderOption: (item) => <ContractorView contractor={rd.of(item)} />,
    getKey: (item) => item.id.toString(),
    getItemId: (item) => item.id,
    useItem: (id) => {
      const props = api.useProps();
      return props.services.contractorService.useContractor(id);
    },
    useItems: (query) => {
      const props = api.useProps();
      return props.services.contractorService.useContractors(
        contractorQueryUtils
          .transform(props.query ?? contractorQueryUtils.ofEmpty())
          .build((q) => [q.withSearch(query)]),
      );
    },
    searchPlaceholder: "Search for a contractor",
    placeholder: "Select a contractor",
  }))
  .transformProps((x) => x.passAll);

export const ContractorMultiPicker = injectConfig(
  AbstractMultiPicker<Contractor["id"], Contractor>,
)
  .fromProps<
    WithServices<[WithContractorService]> & { query?: ContractorQuery }
  >((api) => ({
    renderItem: (item, props) => (
      <ContractorView
        layout={props.value.length > 1 ? "avatar" : props.layout}
        size={props.size}
        contractor={unassignedUtils.mapOrElse(item, rd.of, rd.ofIdle())}
      />
    ),
    renderOption: (item) => <ContractorView contractor={rd.of(item)} />,
    getKey: (item) => item.id.toString(),
    getItemId: (item) => item.id,
    useSelectedItems: (ids) => {
      const props = api.useProps();
      return props.services.contractorService.useContractors(
        contractorQueryUtils
          .getBuilder()
          .build((x) => [
            x.withFilter("id", { operator: "oneOf", value: ids }),
          ]),
      );
    },
    useItems: (query) => {
      const props = api.useProps();
      return props.services.contractorService.useContractors(
        contractorQueryUtils
          .transform(props.query ?? contractorQueryUtils.ofEmpty())
          .build((q) => [q.withSearch(query)]),
      );
    },
    searchPlaceholder: "Search for a contractor",
    placeholder: "Select a contractor",
  }))
  .transformProps((x) => x.passAll);
