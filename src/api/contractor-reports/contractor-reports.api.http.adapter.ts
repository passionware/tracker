import { ContractorReport$ } from "@/api/contractor-reports/contractor-reports.api.http.schema.ts";
import { ContractorReport } from "@/api/contractor-reports/contractor-reports.api.ts";
import camelcaseKeys from "camelcase-keys";

export function fromHttp(
  contractorReport: ContractorReport$,
): ContractorReport {
  return camelcaseKeys(contractorReport);
}
