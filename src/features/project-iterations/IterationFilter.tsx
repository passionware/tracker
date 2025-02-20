import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { maybe } from "@passionware/monads";
import { capitalize } from "lodash";
import { ListFilter } from "lucide-react";

export function IterationFilterDropdown(props: WithFrontServices) {
  const status =
    props.services.locationService.useCurrentProjectIterationStatus();
  const workspaceId = props.services.locationService.useCurrentWorkspaceId();
  const clientId = props.services.locationService.useCurrentClientId();
  const projectId = props.services.locationService.useCurrentProjectId();
  const forProject = props.services.routingService
    .forWorkspace(workspaceId)
    .forClient(clientId)
    .forProject(projectId?.toString());
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <ListFilter /> {maybe.map(status, capitalize)} iterations
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        <DropdownMenuItem
          onClick={() =>
            props.services.navigationService.navigate(
              forProject.iterations("all"),
            )
          }
        >
          All iterations
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            props.services.navigationService.navigate(
              forProject.iterations("active"),
            )
          }
        >
          Active iterations
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            props.services.navigationService.navigate(
              forProject.iterations("closed"),
            )
          }
        >
          Closed iterations
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
