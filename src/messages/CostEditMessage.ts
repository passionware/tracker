import { CostPayload } from "@/api/cost/cost.api.ts";

export interface CostEditMessage {
  request: {
    defaultValues: Partial<CostPayload>;
  };
  response:
    | {
        action: "cancel";
      }
    | {
        action: "confirm";
        variable: CostPayload;
        changes: Partial<CostPayload>;
      };
}
