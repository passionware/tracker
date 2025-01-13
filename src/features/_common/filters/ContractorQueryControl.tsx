import { EnumFilter } from "@/api/_common/query/filters/EnumFilter.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";
import {
  ContractorPicker,
  ContractorPickerProps,
  None,
} from "@/features/_common/inline-search/ContractorPicker.tsx";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import { maybe } from "@passionware/monads";

export interface ContractorQueryControlProps
  extends Omit<ContractorPickerProps, "value" | "onSelect"> {
  filter: Nullable<EnumFilter<None | Contractor["id"]>>;
  onFilterChange: (
    filter: Nullable<EnumFilter<None | Contractor["id"]>>,
  ) => void;
}

function getValue(filter: Nullable<EnumFilter<None | Contractor["id"]>>) {
  if (maybe.isAbsent(filter)) {
    return null;
  }
  if (filter.operator !== "oneOf") {
    throw new Error("ContractorQueryControl only supports oneOf operator");
  }
  if (filter.value.length != 1) {
    throw new Error("ContractorQueryControl only supports one value");
  }
  return filter.value[0];
}

export function ContractorQueryControl({
  filter,
  onFilterChange,
  ...rest
}: ContractorQueryControlProps) {
  const contractorFilter = getValue(filter);

  return (
    <ContractorPicker
      allowClear
      size="xs"
      value={contractorFilter}
      onSelect={(contractorId) => {
        onFilterChange(
          maybe.mapOrNull(contractorId, (id) => ({
            operator: "oneOf",
            value: [id],
          })),
        );
      }}
      {...rest}
    />
  );
}
