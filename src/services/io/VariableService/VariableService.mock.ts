import { variableMock } from "@/api/variable/variable.mock.ts";
import { VariableService } from "@/services/io/VariableService/VariableService.ts";
import { rd } from "@passionware/monads";

export function createVariableService(): VariableService {
  return {
    useVariables: () => rd.of(variableMock.static.list),
    ensureVariables: () => Promise.resolve(variableMock.static.list),
    createVariable: () => Promise.resolve({ id: 1 }),
    deleteVariable: () => Promise.resolve(),
    updateVariable: () => Promise.resolve(),
  };
}
