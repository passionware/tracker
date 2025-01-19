import { Variable } from "@/api/variable/variable.api.ts";
import { variableMock } from "@/api/variable/variable.mock.ts";
import { VariableService } from "@/services/io/VariableService/VariableService.ts";
import { rd, RemoteData } from "@passionware/monads";
import { ArgsAccessor } from "@passionware/platform-storybook";

export function createVariableService(config: {
  onAction?: (action: string, ...rest: unknown[]) => void;
  data?:
    | {
        initial: Variable[];
      }
    | {
        accessor: ArgsAccessor<{ variables: RemoteData<Variable[]> }>;
      };
}): VariableService {
  function createUseVariables() {
    const data = config.data;
    if (!data) {
      return () => rd.of(variableMock.static.list);
    }
    if ("initial" in data) {
      return () => rd.of(data.initial);
    } else {
      return () => data.accessor.useArgs().variables;
    }
  }

  function createEnsureVariables() {
    const data = config.data;
    if (!data) {
      return () => Promise.resolve(variableMock.static.list);
    }
    if ("initial" in data) {
      return () => Promise.resolve(data.initial);
    } else {
      return () =>
        Promise.resolve(rd.getOrThrow(data.accessor.getLatestArgs().variables));
    }
  }

  return {
    useVariables: createUseVariables(),
    ensureVariables: createEnsureVariables(),
    createVariable: (variable) => {
      config.onAction?.("createVariable", variable);
      return Promise.resolve({ id: 1 });
    },
    deleteVariable: (id) => {
      config.onAction?.("deleteVariable", id);
      return Promise.resolve();
    },
    updateVariable: (id, variable) => {
      config.onAction?.("updateVariable", { id, variable });
      return Promise.resolve();
    },
  };
}
