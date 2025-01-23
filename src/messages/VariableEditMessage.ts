import { VariablePayload } from "@/api/variable/variable.api.ts";

export interface VariableEditMessage {
  request: {
    defaultValues: Partial<VariablePayload>;
    operatingMode: "create" | "edit" | "duplicate";
  };
  response:
    | {
        action: "cancel";
      }
    | {
        action: "confirm";
        payload: VariablePayload;
        changes: Partial<VariablePayload>;
      };
}
