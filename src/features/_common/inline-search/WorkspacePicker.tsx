import {
  Workspace,
  workspaceQueryUtils,
} from "@/api/workspace/workspace.api.ts";
import { AbstractPicker } from "@/features/_common/inline-search/_common/AbstractPicker.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd } from "@passionware/monads";
import { injectConfig } from "@passionware/platform-react";
import { WorkspaceView } from "../WorkspaceView";

export const WorkspacePicker = injectConfig(
  AbstractPicker<Workspace["id"], Workspace>,
)
  .fromProps<WithServices<[WithWorkspaceService]>>((api) => ({
    renderItem: (item, props) => (
      <WorkspaceView
        size={props.size === "xs" ? "xs" : "md"}
        workspace={rd.of(item)}
      />
    ),
    renderOption: (item) => <WorkspaceView workspace={rd.of(item)} />,
    getKey: (item) => item.id.toString(),
    getItemId: (item) => item.id,
    useItem: (id) => {
      const props = api.useProps();
      return props.services.workspaceService.useWorkspace(id);
    },
    useItems: (query) => {
      const props = api.useProps();
      return props.services.workspaceService.useWorkspaces(
        workspaceQueryUtils.setSearch(workspaceQueryUtils.ofEmpty(), query),
      );
    },
    searchPlaceholder: "Search for a workspace",
    placeholder: "Select a workspace",
  }))
  .transformProps((x) => x.passAll);
