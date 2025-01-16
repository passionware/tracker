import { ContractorReport } from "@/api/contractor-reports/contractor-reports.api.ts";
import { Cost } from "@/api/cost/cost.api.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";

export type LinkCostReport = {
  id: number;
  createdAt: Date;
  costAmount: number;
  reportAmount: number;
  description: string;
  costId: Nullable<number>;
  contractorReportId: Nullable<number>;
  // references to the linked entities
  cost: Cost | null;
  contractorReport: Nullable<ContractorReport>;
};
