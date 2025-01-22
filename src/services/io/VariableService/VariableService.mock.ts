import { Variable } from "@/api/variable/variable.api.ts";
import { VariableService } from "@/services/io/VariableService/VariableService.ts";
import { rd, RemoteData } from "@passionware/monads";
import { ArgsScopedAccessor } from "@passionware/platform-storybook";

export function createVariableService(config: {
  onAction?: (action: string, ...rest: unknown[]) => void;
  accessor: ArgsScopedAccessor<RemoteData<Variable[]>>;
}): VariableService {
  return {
    useVariables: config.accessor.use,
    ensureVariables: () =>
      Promise.resolve(rd.getOrThrow(config.accessor.get())),
    createVariable: (variable) => {
      config?.onAction?.("createVariable", variable);
      return Promise.resolve({ id: 1 });
    },
    deleteVariable: (id) => {
      config?.onAction?.("deleteVariable", id);
      return Promise.resolve();
    },
    updateVariable: (id, variable) => {
      config?.onAction?.("updateVariable", { id, variable });
      return Promise.resolve();
    },
  };
}
