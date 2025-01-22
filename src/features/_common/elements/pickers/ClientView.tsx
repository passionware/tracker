import { Client } from "@/api/clients/clients.api.ts";
import {
  AbstractEntityView,
  AbstractEntityViewProps,
} from "@/features/_common/elements/pickers/_common/AbstractEntityView.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { SwitchProps } from "@/platform/typescript/SwitchProps.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { Maybe, RemoteData } from "@passionware/monads";

export type ClientViewProps = SwitchProps<
  AbstractEntityViewProps,
  "entity",
  { client: RemoteData<Client> }
>;

export function ClientView({ client, ...props }: ClientViewProps) {
  return <AbstractEntityView entity={client} {...props} />;
}

export type ClientWidgetProps = WithServices<[WithClientService]> &
  SwitchProps<
    ClientViewProps,
    "client",
    {
      clientId: Maybe<number>;
    }
  >;

export function ClientWidget({ clientId, ...props }: ClientWidgetProps) {
  const client = props.services.clientService.useClient(clientId);
  return <ClientView client={client} {...props} />;
}
