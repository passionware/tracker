import type { CockpitCubeReportWithCreator } from "@/api/cockpit-cube-reports/cockpit-cube-reports.api.ts";
import type { CubeDataItem } from "@/features/_common/Cube/CubeService.types";
import type { SerializableCubeConfig } from "@/features/_common/Cube/serialization/CubeSerialization.types";
import { CalendarDate } from "@internationalized/date";

const PREVIEW_START = new CalendarDate(2026, 4, 1);
const PREVIEW_END = new CalendarDate(2026, 4, 15);

const previewCubeConfig: SerializableCubeConfig = {
  metadata: {
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    name: "Project email preview",
  },
  dataSchema: {
    fields: [
      { name: "id", type: "string", nullable: false },
      { name: "contractorId", type: "string", nullable: true },
      { name: "startAt", type: "string", nullable: true },
      { name: "numHours", type: "number", nullable: false, defaultValue: 0 },
      {
        name: "billingValue",
        type: "number",
        nullable: false,
        defaultValue: 0,
      },
    ],
  },
  dimensions: [
    {
      id: "contractor",
      name: "Contractor",
      icon: "👤",
      fieldName: "contractorId",
      labelMapping: { "1": "Alex Example", "2": "Sam Sample" },
    },
    {
      id: "date",
      name: "Date",
      icon: "📅",
      fieldName: "startAt",
      formatFunction: { type: "date", parameters: { format: "short" } },
    },
  ],
  measures: [
    {
      id: "hours",
      name: "Hours",
      icon: "⏱️",
      fieldName: "numHours",
      aggregationFunction: "sum",
      formatFunction: { type: "number", parameters: { decimals: 2 } },
    },
    {
      id: "billing",
      name: "Billing",
      icon: "💳",
      fieldName: "billingValue",
      aggregationFunction: "sum",
      formatFunction: {
        type: "currency",
        parameters: { currency: "EUR", decimals: 2 },
      },
    },
  ],
  activeMeasures: ["hours", "billing"],
};

const previewCubeRows: CubeDataItem[] = [
  {
    id: "row-1",
    contractorId: "1",
    startAt: "2026-04-05T12:00:00.000Z",
    numHours: 12,
    billingValue: 2400,
  },
  {
    id: "row-2",
    contractorId: "2",
    startAt: "2026-04-08T12:00:00.000Z",
    numHours: 8,
    billingValue: 1600,
  },
];

export function buildProjectEmailPreviewReport(params: {
  invoiceBodyMarkdownTemplate: string | null | undefined;
  reminderBodyMarkdownTemplate: string | null | undefined;
  emailSubjectTemplateInvoice: string | null | undefined;
  emailSubjectTemplateReminder: string | null | undefined;
  billingDueDate: CalendarDate;
}): CockpitCubeReportWithCreator {
  const billingDueStr = params.billingDueDate.toString();
  return {
    id: "project-email-preview",
    tenant_id: "",
    name: "Email preview",
    description: null,
    cube_config: previewCubeConfig as unknown as Record<string, unknown>,
    cube_data: {
      data: previewCubeRows,
      meta: {
        source: {
          invoiceEmailBodyMarkdownTemplate:
            params.invoiceBodyMarkdownTemplate?.trim() || null,
          reminderEmailBodyMarkdownTemplate:
            params.reminderBodyMarkdownTemplate?.trim() || null,
          emailSubjectTemplateInvoice:
            params.emailSubjectTemplateInvoice?.trim() || null,
          emailSubjectTemplateReminder:
            params.emailSubjectTemplateReminder?.trim() || null,
          billingDueDate: billingDueStr,
        },
      },
    },
    created_by: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_published: true,
    start_date: PREVIEW_START,
    end_date: PREVIEW_END,
  };
}
