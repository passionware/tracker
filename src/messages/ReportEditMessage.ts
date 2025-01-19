import { ReportPayload } from "@/api/reports/reports.api.ts";

export interface ReportEditMessage {
  request: {
    defaultValues: Partial<ReportPayload>;
  };
  response:
    | {
        action: "cancel";
      }
    | {
        action: "confirm";
        variable: ReportPayload;
        changes: Partial<ReportPayload>;
      };
}
