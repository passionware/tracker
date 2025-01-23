import { CostPayload } from "@/api/cost/cost.api.ts";

export interface CostEditMessage {
  request: {
    defaultValues: Partial<CostPayload>;
    operatingMode: "create" | "edit" | "duplicate";
  };
  response:
    | {
        action: "cancel";
      }
    | {
        action: "confirm";
        payload: CostPayload;
        changes: Partial<CostPayload>;
      };
}
