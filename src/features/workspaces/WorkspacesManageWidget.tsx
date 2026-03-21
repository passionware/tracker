import {
  Workspace,
  WorkspaceQuery,
  workspaceQueryUtils,
} from "@/api/workspace/workspace.api.ts";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Input } from "@/components/ui/input.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { useEntityDrawerContext } from "@/features/_common/drawers/entityDrawerContext.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { getInitials } from "@/platform/lang/getInitials.ts";
import { useDebouncedUrlSyncedSearch } from "@/platform/react/useDebouncedUrlSyncedSearch.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithQueryParamsService } from "@/services/internal/QueryParamsService/QueryParamsService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { createColumnHelper } from "@tanstack/react-table";
import { useCallback, useMemo, useRef } from "react";

const columnHelper = createColumnHelper<Workspace>();

export interface WorkspacesManageWidgetProps
  extends WithServices<
    [
      WithWorkspaceService,
      WithPreferenceService,
      WithQueryParamsService<{
        workspaces: WorkspaceQuery;
      }>,
    ]
  > {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
}

export function WorkspacesManageWidget(props: WorkspacesManageWidgetProps) {
  const { openEntityDrawer } = useEntityDrawerContext();
  const queryParamsService =
    props.services.queryParamsService.forEntity("workspaces");
  const queryParams = queryParamsService.useQueryParams();
  const query = workspaceQueryUtils.ensureDefault(queryParams);
  const queryRef = useRef(query);
  queryRef.current = query;

  const commitSearchToUrl = useCallback(
    (search: string) => {
      queryParamsService.setQueryParams(
        workspaceQueryUtils.setSearch(queryRef.current, search),
      );
    },
    [queryParamsService],
  );

  const workspaceSearch = useDebouncedUrlSyncedSearch(
    query.search,
    commitSearchToUrl,
    { debounceMs: 300 },
  );

  const workspacesRd = props.services.workspaceService.useWorkspaces(query);

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
      columnHelper.accessor("slug", {
        header: "Slug",
        meta: { sortKey: "slug" },
        cell: (info) => (
          <span className="font-mono text-sm text-muted-foreground">
            {info.getValue()}
          </span>
        ),
      }),
    ],
    [],
  );

  return (
    <CommonPageContainer
      tools={
        <Input
          placeholder="Search workspaces…"
          value={workspaceSearch.inputValue}
          onChange={(e) => workspaceSearch.setInputValue(e.target.value)}
          className="h-8 w-48 lg:w-64"
        />
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
        <BreadcrumbPage>Workspaces</BreadcrumbPage>,
      ]}
    >
      <ListView
        query={query}
        onQueryChange={(next) => queryParamsService.setQueryParams(next)}
        getRowId={(x) => x.id}
        data={workspacesRd}
        columns={columns}
        onRowClick={(row) =>
          openEntityDrawer({ type: "workspace", id: row.id })
        }
      />
    </CommonPageContainer>
  );
}
