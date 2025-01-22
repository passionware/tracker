import { Client, clientQueryUtils } from "@/api/clients/clients.api.ts";
import { ClientView } from "@/features/_common/pickers/ClientView.tsx";
import { AbstractPicker } from "@/features/_common/pickers/_common/AbstractPicker.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { rd } from "@passionware/monads";
import { injectConfig } from "@passionware/platform-react";

export const ClientPicker = injectConfig(AbstractPicker<Client["id"], Client>)
  .fromProps<WithServices<[WithClientService]>>((api) => ({
    renderItem: (item,props) => <ClientView size={props.size} client={rd.of(item)} />,
    renderOption: (item) => <ClientView client={rd.of(item)} />,
    getKey: (item) => item.id.toString(),
    getItemId: (item) => item.id,
    useItem: (id) => {
      const props = api.useProps();
      return props.services.clientService.useClient(id);
    },
    useItems: (query) => {
      const props = api.useProps();
      return props.services.clientService.useClients(
        clientQueryUtils.setSearch(clientQueryUtils.ofEmpty(), query),
      );
    },
    searchPlaceholder: "Search for a client",
    placeholder: "Select a client",
  }))
  .transformProps((x) => x.passAll);
