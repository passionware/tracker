import { ReportService } from "@/services/io/ReportService/ReportService.ts";
import { rd } from "@passionware/monads";

export function createReportService(): ReportService {
  return {
    useReports: () => {
      return rd.of([]);
    },
    useReport: () => {
      return rd.ofError(new Error("Not implemented"));
    },
    ensureReport: () => {
      throw new Error("Not implemented");
    },
    ensureReports: () => {
      throw new Error("Not implemented");
    },
  };
}
