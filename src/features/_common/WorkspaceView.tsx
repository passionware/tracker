import { Workspace } from "@/api/workspace/workspace.api.ts";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";
import { getInitials } from "@/platform/lang/getInitials.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd, RemoteData } from "@passionware/monads";
import { cva, VariantProps } from "class-variance-authority";
import { CircleSlash, TriangleAlert } from "lucide-react";

export interface WorkspaceViewProps
  extends VariantProps<typeof workspaceViewVariants> {
  workspace: RemoteData<Workspace>;
  layout?: "full" | "avatar";
  className?: string;
}

const workspaceViewVariants = cva("", {
  variants: {
    size: { xs: "size-4", sm: "size-6", md: "size-8", lg: "size-12" },
  },
  defaultVariants: {
    size: "md",
  },
});

export function WorkspaceView({
  workspace,
  layout,
  className,
  size,
}: WorkspaceViewProps) {
  const avatar = (
    <Avatar className={cn(workspaceViewVariants({ size }), className)}>
      {rd
        .fullJourney(workspace)
        .initially(
          <SimpleTooltip title="No workspace">
            <CircleSlash className="w-full h-full text-slate-400" />
          </SimpleTooltip>,
        )
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
        .fullJourney(workspace)
        .initially("No workspace")
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
