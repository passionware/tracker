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
        payload: ReportPayload;
        changes: Partial<ReportPayload>;
      };
}
