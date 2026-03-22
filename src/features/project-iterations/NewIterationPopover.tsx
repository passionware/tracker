import { Project } from "@/api/project/project.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { useEntityDrawerContext } from "@/features/_common/drawers/entityDrawerContext.tsx";
import { PlusCircle } from "lucide-react";

export function NewIterationPopover(
  props: WithFrontServices & {
    className?: string;
    projectId: Project["id"];
  },
) {
  const { openEntityDrawer } = useEntityDrawerContext();

  return (
    <Button
      variant="accent1"
      size="sm"
      className="flex"
      onClick={() =>
        openEntityDrawer({
          type: "project-iteration",
          intent: "create",
          projectId: props.projectId,
          draftKey: `nav-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        })
      }
    >
      <PlusCircle />
      Add iteration
    </Button>
  );
}
