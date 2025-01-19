import { Nullable } from "@/platform/typescript/Nullable.ts";

export type LinkCostReport = {
  id: number;
  createdAt: Date;
  costAmount: number;
  reportAmount: number;
  description: string;
  costId: Nullable<number>;
  reportId: Nullable<number>;
};
