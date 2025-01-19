import { Nullable } from "@/platform/typescript/Nullable.ts";

// todo: make it exclusively nullable for clarifications, as in other link payloads
export interface LinkCostReportPayload {
  costAmount: number;
  reportAmount: number;
  description: string;
  costId: Nullable<number>;
  reportId: Nullable<number>;
}

export interface LinkCostReport extends LinkCostReportPayload {
  id: number;
  createdAt: Date;
}
