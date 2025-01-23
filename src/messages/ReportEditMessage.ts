import { ReportPayload } from "@/api/reports/reports.api.ts";

export interface ReportEditMessage {
  request: {
    defaultValues: Partial<ReportPayload>;
    operatingMode: "create" | "edit" | "duplicate";
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
