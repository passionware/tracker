import { Workspace } from "@/api/workspace/workspace.api.ts";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { getInitials } from "@/platform/lang/getInitials.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd, RemoteData } from "@passionware/monads";
import { TriangleAlert } from "lucide-react";

export interface WorkspaceViewProps {
  workspace: RemoteData<Workspace>;
  layout?: "full" | "avatar";
}

export function WorkspaceView({ workspace, layout }: WorkspaceViewProps) {
  const avatar = (
    <Avatar className="size-8">
      {rd
        .journey(workspace)
        .wait(<Skeleton className="size-8 rounded-full" />)
        .catch(() => (
          <AvatarFallback>
            <TriangleAlert />
          </AvatarFallback>
        ))
        .map((workspace) => (
          <>
            {workspace.avatarUrl && (
              <AvatarImage src={workspace.avatarUrl} alt={workspace.name} />
            )}
            <AvatarFallback>{getInitials(workspace.name)}</AvatarFallback>
          </>
        ))}
    </Avatar>
  );

  if (layout === "avatar") {
    return (
      <SimpleTooltip title={rd.tryGet(workspace)?.name}>{avatar}</SimpleTooltip>
    );
  }

  return (
    <div className="flex items-center flex-row gap-2 text-xs whitespace-pre">
      {avatar}
      {rd
        .journey(workspace)
        .wait(<Skeleton className="w-20" />)
        .catch(() => "error")
        .map((workspace) => workspace.name)}
    </div>
  );
}

export type WorkspaceWidgetProps = Omit<WorkspaceViewProps, "workspace"> &
  WithServices<[WithWorkspaceService]> & {
    workspaceId: Workspace["id"];
  };

export function WorkspaceWidget({
  workspaceId,
  ...props
}: WorkspaceWidgetProps) {
  const workspace = props.services.workspaceService.useWorkspace(workspaceId);
  return <WorkspaceView workspace={workspace} {...props} />;
}

/**
 *
 *
 * Todo:
 * przemyśleć niezależne sidebary (różne tryby):
 * * workspace scoped -> company scoped -> wszystko z Atellio na spółce zoo
 *   -> /workspace/1/company/2
 * * company scoped -> all workspaces -> wszystko z Atellio na spółce i na JDG etc
 *   -> /workspace/all/company/1
 * * workspace scoped -> all companies -> wszystkie sprawy spółki, albo wszystkie sprawy mojego JDG
 *   -> /workspace/1/company/all
 * * all workspaces -> all companies -> wszystkie sprawy wszystkich podmiotów, np time tracker
 *   -> /workspace/all/company/all
 *
 * * główny dashboard - wybór trybu
 *   -> /
 *
 *   co więcej, np sprawy pojedynczego kontraktora dla spółki zoo
 *   -> /workspace/1/contractor/2
 *   lub dla wszystkich spółek
 *   -> /workspace/all/contractor/2
 *
 *   jeszcze specjalny tryb time trackera
 *
 *   -> raczej nie, uzyjemy /workspace/all/company/all/tracker
 *   -> /time-tracker/workspace/1/company/2 (naliczanie czasu dla klienta 2 w ramach workspace 1), z możliwością przełączania się między workspace'ami i klientami (zmiana path segmentów)
 */
