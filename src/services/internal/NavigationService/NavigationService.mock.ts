import { NavigationService } from "@/services/internal/NavigationService/NavigationService.ts";
import { ArgsScopedAccessor } from "@passionware/platform-storybook";

export function createNavigationService(
  accessor: ArgsScopedAccessor<(path: string) => void>,
  newParam: NavigationService = {
    navigate: (to) => accessor.get()(`Navigated to ${to}`),
    match: () => null,
    useMatch: () => null,
  },
): NavigationService {
  return newParam;
}
