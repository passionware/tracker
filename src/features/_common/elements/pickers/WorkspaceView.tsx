import { Workspace } from "@/api/workspace/workspace.api.ts";
import {
  AbstractEntityView,
  AbstractEntityViewProps,
} from "@/features/_common/elements/pickers/_common/AbstractEntityView.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { SwitchProps } from "@/platform/typescript/SwitchProps.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { RemoteData } from "@passionware/monads";

export type WorkspaceViewProps = SwitchProps<
  AbstractEntityViewProps,
  "entity",
  {
    workspace: RemoteData<Workspace>;
  }
>;

export function WorkspaceView({ workspace, ...props }: WorkspaceViewProps) {
  return <AbstractEntityView entity={workspace} {...props} />;
}

export type WorkspaceWidgetProps = WithServices<[WithWorkspaceService]> &
  SwitchProps<
    WorkspaceViewProps,
    "workspace",
    {
      workspaceId: Workspace["id"];
    }
  >;

export function WorkspaceWidget({
  workspaceId,
  ...props
}: WorkspaceWidgetProps) {
  const workspace = props.services.workspaceService.useWorkspace(workspaceId);
  return <WorkspaceView workspace={workspace} {...props} />;
}
