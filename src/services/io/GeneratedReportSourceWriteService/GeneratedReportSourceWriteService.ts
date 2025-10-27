import { GeneratedReportSourceApi } from "@/api/generated-report-source/generated-report-source.api.ts";

export interface GeneratedReportSourceWriteService {
  createGeneratedReportSource: GeneratedReportSourceApi["createGeneratedReportSource"];
  updateGeneratedReportSource: GeneratedReportSourceApi["updateGeneratedReportSource"];
  deleteGeneratedReportSource: GeneratedReportSourceApi["deleteGeneratedReportSource"];
}

export interface WithGeneratedReportSourceWriteService {
  generatedReportSourceWriteService: GeneratedReportSourceWriteService;
}
