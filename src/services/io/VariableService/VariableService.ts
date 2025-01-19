import {
  Variable,
  VariableApi,
  VariableQuery,
} from "@/api/variable/variable.api.ts";
import { Maybe, RemoteData } from "@passionware/monads";

export interface VariableService {
  useVariables(query: Maybe<VariableQuery>): RemoteData<Variable[]>;
  ensureVariables(query: VariableQuery): Promise<Variable[]>;
  createVariable: VariableApi["createVariable"];
  updateVariable: VariableApi["updateVariable"];
  deleteVariable: VariableApi["deleteVariable"];
}

export interface WithVariableService {
  variableService: VariableService;
}
