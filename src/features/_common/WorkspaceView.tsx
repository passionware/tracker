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
