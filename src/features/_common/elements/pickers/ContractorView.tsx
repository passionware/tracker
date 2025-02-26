import { ContractorBase } from "@/api/contractor/contractor.api.ts";
import {
  AbstractEntityView,
  AbstractEntityViewProps,
} from "@/features/_common/elements/pickers/_common/AbstractEntityView.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { SwitchProps } from "@/platform/typescript/SwitchProps.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { Maybe, rd, RemoteData } from "@passionware/monads";

export type ContractorViewProps = SwitchProps<
  AbstractEntityViewProps,
  "entity",
  { contractor: RemoteData<ContractorBase> }
>;

export function ContractorView({ contractor, ...props }: ContractorViewProps) {
  return (
    <AbstractEntityView
      entity={rd.map(contractor, (x) => ({
        name: x.fullName,
        avatarUrl: null,
      }))}
      {...props}
    />
  );
}

export type ContractorWidgetProps = WithServices<[WithContractorService]> &
  SwitchProps<
    ContractorViewProps,
    "contractor",
    {
      contractorId: Maybe<number>;
    }
  >;

export function ContractorWidget({
  contractorId,
  ...props
}: ContractorWidgetProps) {
  const contractor =
    props.services.contractorService.useContractor(contractorId);
  return <ContractorView contractor={contractor} {...props} />;
}
