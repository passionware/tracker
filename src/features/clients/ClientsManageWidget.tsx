import {
  Client,
  ClientQuery,
  clientQueryUtils,
} from "@/api/clients/clients.api.ts";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { PopoverHeader } from "@/components/ui/popover.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { useEntityDrawerContext } from "@/features/_common/drawers/entityDrawerContext.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { ClientForm } from "@/features/clients/ClientForm.tsx";
import { getInitials } from "@/platform/lang/getInitials.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { useDebouncedUrlSyncedSearch } from "@/platform/react/useDebouncedUrlSyncedSearch.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithQueryParamsService } from "@/services/internal/QueryParamsService/QueryParamsService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { createColumnHelper } from "@tanstack/react-table";
import { PlusCircle } from "lucide-react";
import { useCallback, useMemo, useRef } from "react";

const columnHelper = createColumnHelper<Client>();

export interface ClientsManageWidgetProps
  extends WithServices<
    [
      WithClientService,
      WithMutationService,
      WithWorkspaceService,
      WithPreferenceService,
      WithQueryParamsService<{
        clients: ClientQuery;
      }>,
    ]
  > {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
}

export function ClientsManageWidget(props: ClientsManageWidgetProps) {
  const { openEntityDrawer } = useEntityDrawerContext();
  const queryParamsService =
    props.services.queryParamsService.forEntity("clients");
  const queryParams = queryParamsService.useQueryParams();
  const query = clientQueryUtils.ensureDefault(queryParams);
  const queryRef = useRef(query);
  queryRef.current = query;

  const commitSearchToUrl = useCallback(
    (search: string) => {
      queryParamsService.setQueryParams(
        clientQueryUtils.setSearch(queryRef.current, search),
      );
    },
    [queryParamsService],
  );

  const clientSearch = useDebouncedUrlSyncedSearch(
    query.search,
    commitSearchToUrl,
    { debounceMs: 300 },
  );

  const clientsRd = props.services.clientService.useClients(query);

  const scopedWorkspaceId = idSpecUtils.isAll(props.workspaceId)
    ? null
    : props.workspaceId;

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "avatar",
        header: "",
        meta: { headerClassName: "w-14 max-w-14" },
        cell: ({ row }) => (
          <Avatar className="size-8">
            {row.original.avatarUrl ? (
              <AvatarImage src={row.original.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback className="text-[10px]">
              {getInitials(row.original.name)}
            </AvatarFallback>
          </Avatar>
        ),
      }),
      columnHelper.accessor("name", {
        header: "Name",
        meta: { sortKey: "name" },
        cell: (info) => (
          <span className="font-medium">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("senderName", {
        header: "Bank sender",
        meta: { sortKey: "senderName" },
        cell: (info) => (
          <span className="text-muted-foreground">
            {info.getValue() ?? "—"}
          </span>
        ),
      }),
    ],
    [],
  );

  return (
    <CommonPageContainer
      tools={
        <>
          <Input
            placeholder="Search clients…"
            value={clientSearch.inputValue}
            onChange={(e) => clientSearch.setInputValue(e.target.value)}
            className="h-8 w-48 lg:w-64"
          />
          <InlinePopoverForm
            trigger={
              <Button variant="accent1" size="sm" className="flex gap-1.5">
                <PlusCircle className="size-4" />
                Add client
              </Button>
            }
            content={(bag) => (
              <>
                <PopoverHeader className="px-0 pt-0">New client</PopoverHeader>
                <ClientForm
                  mode="create"
                  fixedWorkspaceId={
                    scopedWorkspaceId === null ? undefined : scopedWorkspaceId
                  }
                  services={props.services}
                  onCancel={bag.close}
                  onSubmit={async (payload) => {
                    await props.services.mutationService.createClient(payload);
                    bag.close();
                  }}
                />
              </>
            )}
          />
        </>
      }
      segments={[
        <WorkspaceBreadcrumbLink
          workspaceId={props.workspaceId}
          services={props.services}
        />,
        <ClientBreadcrumbLink
          clientId={props.clientId}
          services={props.services}
        />,
        <BreadcrumbPage>Clients</BreadcrumbPage>,
      ]}
    >
      <ListView
        query={query}
        onQueryChange={(next) => queryParamsService.setQueryParams(next)}
        getRowId={(x) => x.id}
        data={clientsRd}
        columns={columns}
        onRowClick={(row) =>
          openEntityDrawer({ type: "client", id: row.id })
        }
      />
    </CommonPageContainer>
  );
}
