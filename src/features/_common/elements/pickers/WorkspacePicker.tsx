import { unassignedUtils } from "@/api/_common/query/filters/Unassigned.ts";
import {
  Workspace,
  workspaceQueryUtils,
} from "@/api/workspace/workspace.api.ts";
import { AbstractPicker } from "@/features/_common/elements/pickers/_common/AbstractPicker.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd } from "@passionware/monads";
import { injectConfig } from "@passionware/platform-react";
import { ComponentProps } from "react";
import { WorkspaceView } from "./WorkspaceView.tsx";
import { AbstractMultiPicker } from "./_common/AbstractMultiPicker.tsx";

export const WorkspacePicker = injectConfig(
  AbstractPicker<Workspace["id"], Workspace>,
)
  .fromProps<WithServices<[WithWorkspaceService]>>((api) => ({
    renderItem: (item, props) => (
      <WorkspaceView
        layout={props.layout}
        size={props.size}
        workspace={unassignedUtils.mapOrElse(item, rd.of, rd.ofIdle())}
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

export type WorkspacePickerProps = ComponentProps<typeof WorkspacePicker>;
export const WorkspaceMultiPicker = injectConfig(
  AbstractMultiPicker<Workspace["id"], Workspace>,
)
  .fromProps<WithServices<[WithWorkspaceService]>>((api) => ({
    renderItem: (item, props) => (
      <WorkspaceView
        layout={props.value.length > 1 ? "avatar" : props.layout}
        size={props.size}
        workspace={unassignedUtils.mapOrElse(item, rd.of, rd.ofIdle())}
      />
    ),
    renderOption: (item) => <WorkspaceView workspace={rd.of(item)} />,
    getKey: (item) => item.id.toString(),
    getItemId: (item) => item.id,
    useSelectedItems: (ids) => {
      const props = api.useProps();
      return props.services.workspaceService.useWorkspaces(
        workspaceQueryUtils
          .getBuilder()
          .build((x) => [
            x.withFilter("id", { operator: "oneOf", value: ids }),
          ]),
      );
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

export type WorkspaceMultiPickerProps = ComponentProps<
  typeof WorkspaceMultiPicker
>;
