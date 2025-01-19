import { VariablePayload } from "@/api/variable/variable.api.ts";

export interface VariableEditMessage {
  request: {
    defaultValues: Partial<VariablePayload>;
  };
  response:
    | {
        action: "cancel";
      }
    | {
        action: "confirm";
        variable: VariablePayload;
        changes: Partial<VariablePayload>;
      };
}
