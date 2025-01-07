import { Workspace } from "@/api/workspace/workspace.api.ts";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import { getInitials } from "@/platform/lang/getInitials.ts";

export function WorkspaceView({ workspace }: { workspace: Workspace }) {
  return (
    <div className="flex items-center flex-row gap-2 text-xs whitespace-pre">
      <Avatar className="size-8">
        {workspace.avatarUrl && (
          <AvatarImage src={workspace.avatarUrl} alt={workspace.name} />
        )}
        <AvatarFallback>{getInitials(workspace.name)}</AvatarFallback>
      </Avatar>
      {workspace.name}
    </div>
  );
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
 * * all workspaces -> all companies -> wszystkie sprawy wszystkich podmiotów
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
 *   -> /time-tracker/workspace/1/company/2 (naliczanie czasu dla klienta 2 w ramach workspace 1), z możliwością przełączania się między workspace'ami i klientami (zmiana path segmentów)
 */
