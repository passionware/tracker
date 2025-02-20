import { VariableApi } from "@/api/variable/variable.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { VariableService } from "@/services/io/VariableService/VariableService.ts";
import { QueryClient, useQuery } from "@tanstack/react-query";

export function createVariableService(
  config: { api: VariableApi; client: QueryClient } & WithServices<
    [WithMessageService]
  >,
): VariableService {
  config.services.messageService.reportSystemEffect.subscribeToRequest(
    async (payload) => {
      await config.client.invalidateQueries({ queryKey: ["variable"] });
      payload.sendResponse();
    },
  );

  return {
    useVariables: (query) =>
      useQuery(
        {
          queryKey: ["variable", "list", query],
          enabled: !!query,
          queryFn: () => config.api.getVariables(query!),
        },
        config.client,
      ),
    ensureVariables: (query) =>
      config.client.ensureQueryData({
        queryKey: ["variable", "list", query],
        queryFn: () => config.api.getVariables(query),
      }),
    createVariable: async (variable) => {
      const response = await config.api.createVariable(variable);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Creating variable",
      });
      return response;
    },
    updateVariable: async (id, variable) => {
      const response = await config.api.updateVariable(id, variable);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Editing variable",
      });
      return response;
    },
    deleteVariable: async (id) => {
      const response = await config.api.deleteVariable(id);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Deleting variable",
      });
      return response;
    },
  };
}
