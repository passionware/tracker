import { ContractorReport } from "@/api/contractor-reports/contractor-reports.api.ts";
import { Cost } from "@/api/cost/cost.api.ts";

export type LinkCostReport = {
  id: number;
  createdAt: Date;
  costAmount: number;
  reportAmount: number;
  description: string;
  costId: number;
  contractorReportId: number;
  // references to the linked entities
  cost: Cost | null;
  contractorReport: ContractorReport | null;
};
