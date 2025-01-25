import { unassignedUtils } from "@/api/_common/query/filters/Unassigned.ts";
import { Client, clientQueryUtils } from "@/api/clients/clients.api.ts";
import { AbstractMultiPicker } from "@/features/_common/elements/pickers/_common/AbstractMultiPicker.tsx";
import { AbstractPicker } from "@/features/_common/elements/pickers/_common/AbstractPicker.tsx";
import { ClientView } from "@/features/_common/elements/pickers/ClientView.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { rd } from "@passionware/monads";
import { injectConfig } from "@passionware/platform-react";

export const ClientPicker = injectConfig(AbstractPicker<Client["id"], Client>)
  .fromProps<WithServices<[WithClientService]>>((api) => ({
    renderItem: (item, props) => (
      <ClientView
        layout={props.layout}
        size={props.size}
        client={unassignedUtils.mapOrElse(item, rd.of, rd.ofIdle())}
      />
    ),
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

export const ClientMultiPicker = injectConfig(
  AbstractMultiPicker<Client["id"], Client>,
)
  .fromProps<WithServices<[WithClientService]>>((api) => ({
    renderItem: (item, props) => (
      <ClientView
        layout={props.value.length > 1 ? "avatar" : props.layout}
        size={props.size}
        client={unassignedUtils.mapOrElse(item, rd.of, rd.ofIdle())}
      />
    ),
    renderOption: (item) => <ClientView client={rd.of(item)} />,
    getKey: (item) => item.id.toString(),
    getItemId: (item) => item.id,
    useSelectedItems: (ids) => {
      const props = api.useProps();
      return props.services.clientService.useClients(
        clientQueryUtils
          .getBuilder()
          .build((x) => [
            x.withFilter("id", { operator: "oneOf", value: ids }),
          ]),
      );
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
