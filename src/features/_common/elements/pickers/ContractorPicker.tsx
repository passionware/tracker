import {
  Contractor,
  contractorQueryUtils,
} from "@/api/contractor/contractor.api.ts";
import { ContractorView } from "@/features/_common/elements/pickers/ContractorView.tsx";
import { AbstractPicker } from "@/features/_common/elements/pickers/_common/AbstractPicker.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { rd } from "@passionware/monads";
import { injectConfig } from "@passionware/platform-react";
import { ComponentProps } from "react";

export type ContractorPickerProps = ComponentProps<typeof ContractorPicker>;

export const ContractorPicker = injectConfig(
  AbstractPicker<Contractor["id"], Contractor>,
)
  .fromProps<WithServices<[WithContractorService]>>((api) => ({
    renderItem: (item, props) => (
      <ContractorView
        layout={props.layout}
        size={props.size}
        contractor={rd.of(item)}
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
        contractorQueryUtils.setSearch(contractorQueryUtils.ofEmpty(), query),
      );
    },
    searchPlaceholder: "Search for a contractor",
    placeholder: "Select a contractor",
  }))
  .transformProps((x) => x.passAll);
