import { useMemo, useState } from "react";
import { useWatch, type Control } from "react-hook-form";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { maybe, rd } from "@passionware/monads";
import type { Maybe } from "@passionware/monads";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { EmailTemplateContent } from "@/features/_common/emailTemplates/EmailTemplateContent.tsx";
import { EmailTemplateReminderContent } from "@/features/_common/emailTemplates/EmailTemplateReminderContent.tsx";
import {
  DEFAULT_EMAIL_SUBJECT_TEMPLATE_REMINDER,
  emailSubjectInterpolationVars,
  interpolateEmailSubject,
  resolveInvoiceEmailSubject,
  resolveReminderEmailSubject,
} from "@/features/_common/emailTemplates/emailSubjectTemplate";
import { cn } from "@/lib/utils.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { FormatService } from "@/services/FormatService/FormatService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";

import { buildProjectEmailPreviewReport } from "./projectEmailPreviewMockReport.ts";
import type { ProjectFormModel } from "./projectFormModel.ts";

export type ProjectEmailTemplateTab = "invoice" | "reminder";

export function ProjectEmailTemplatePreview(
  props: WithServices<[WithWorkspaceService, WithClientService]> & {
    control: Control<ProjectFormModel>;
    formatService: FormatService;
    /** Tighter scroll heights when preview sits in a side column next to the form. */
    variant?: "default" | "sideColumn";
    /**
     * When set (e.g. from `ProjectForm` tab state), inner invoice/reminder tab UI is hidden
     * and only this template is shown.
     */
    focusedTemplate?: ProjectEmailTemplateTab | null;
  },
) {
  const {
    services,
    control,
    formatService,
    variant = "default",
    focusedTemplate = null,
  } = props;
  const isSideColumn = variant === "sideColumn";
  const selfManagedTabs = focusedTemplate == null;
  const emailFrameClass = isSideColumn
    ? "min-h-0 flex-1 overflow-y-auto rounded-lg bg-white p-6 shadow-sm"
    : "mx-auto max-h-[min(520px,55vh)] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-sm";

  const workspaceIds = useWatch({ control, name: "workspaceIds" });
  const clientId = useWatch({ control, name: "clientId" });
  const invoiceSubject = useWatch({
    control,
    name: "reportDefaults.invoiceEmail.titleTemplate",
  });
  const reminderSubject = useWatch({
    control,
    name: "reportDefaults.reminderEmail.titleTemplate",
  });
  const invoiceBody = useWatch({
    control,
    name: "reportDefaults.invoiceEmail.bodyMarkdownTemplate",
  });
  const reminderBody = useWatch({
    control,
    name: "reportDefaults.reminderEmail.bodyMarkdownTemplate",
  });

  const workspaceId = workspaceIds?.[0] ?? null;
  const workspaceRd = services.workspaceService.useWorkspace(workspaceId);
  const clientRd = services.clientService.useClient(clientId ?? null);

  const workspaceName = rd.mapOrElse(
    workspaceRd,
    (w) => w.name.trim() || "Workspace",
    "Workspace",
  );
  const clientDisplayName = rd.mapOrElse(
    clientRd,
    (c) => c.name.trim() || "Client",
    "Client Team",
  );

  const [invoiceDueDate, setInvoiceDueDate] = useState<Maybe<CalendarDate>>(
    maybe.of(today(getLocalTimeZone())),
  );
  const [internalTab, setInternalTab] =
    useState<ProjectEmailTemplateTab>("invoice");
  const activeTab = selfManagedTabs ? internalTab : focusedTemplate;

  const reportData = useMemo(
    () =>
      buildProjectEmailPreviewReport({
        invoiceBodyMarkdownTemplate: invoiceBody,
        reminderBodyMarkdownTemplate: reminderBody,
        emailSubjectTemplateInvoice: invoiceSubject,
        emailSubjectTemplateReminder: reminderSubject,
        billingDueDate: maybe.getOrElse(
          invoiceDueDate,
          today(getLocalTimeZone()),
        ),
      }),
    [
      invoiceBody,
      reminderBody,
      invoiceSubject,
      reminderSubject,
      invoiceDueDate,
    ],
  );

  const dueDateAsJsDate = maybe.mapOrElse(
    invoiceDueDate,
    (date: CalendarDate) => new Date(date.year, date.month - 1, date.day),
    null,
  );

  const subjectVars = useMemo(() => {
    const from = formatService.temporal.date(reportData.start_date);
    const to = formatService.temporal.date(reportData.end_date);
    const dueDateFormatted = dueDateAsJsDate
      ? formatService.temporal.date(dueDateAsJsDate)
      : "";
    return emailSubjectInterpolationVars({
      from,
      to,
      workspaceName,
      clientName: clientDisplayName,
      dueDate: dueDateFormatted,
    });
  }, [
    formatService,
    reportData.start_date,
    reportData.end_date,
    workspaceName,
    clientDisplayName,
    dueDateAsJsDate,
  ]);

  const invoiceSubjectResolved = resolveInvoiceEmailSubject(
    invoiceSubject?.trim() || null,
    subjectVars,
  );
  const reminderSubjectResolved = resolveReminderEmailSubject(
    reminderSubject?.trim() || null,
    subjectVars,
    () =>
      subjectVars.dueDate
        ? interpolateEmailSubject(
            DEFAULT_EMAIL_SUBJECT_TEMPLATE_REMINDER,
            subjectVars,
          )
        : `Invoice Reminder — Time & Billing Summary ${subjectVars.from} to ${subjectVars.to}`,
  );

  const tabsShellClass = cn(
    "gap-3",
    isSideColumn ? "flex min-h-0 flex-1 flex-col" : "flex flex-col",
  );
  const paneClassName = cn(
    "mt-0 focus:outline-none",
    isSideColumn ? "flex min-h-0 flex-1 flex-col gap-3" : "space-y-3",
  );

  const invoicePane = (
    <>
      <div className="space-y-1.5 shrink-0">
        <Label className="text-xs text-muted-foreground">
          Subject (preview)
        </Label>
        <Input
          readOnly
          value={invoiceSubjectResolved}
          className="bg-muted/40 text-sm"
        />
      </div>
      <div
        className={cn(
          "flex flex-col rounded-lg bg-slate-100 p-4",
          isSideColumn && "min-h-0 flex-1",
        )}
      >
        <div className={emailFrameClass}>
          <EmailTemplateContent
            reportData={reportData}
            formatService={formatService}
            workspaceLogoDataUrl=""
            workspaceName={workspaceName}
            clientDisplayName={clientDisplayName}
            clientAvatarDataUrl={null}
          />
        </div>
      </div>
    </>
  );

  const reminderPane = (
    <>
      <div className="space-y-1.5 shrink-0">
        <Label className="text-xs text-muted-foreground">
          Subject (preview)
        </Label>
        <Input
          readOnly
          value={reminderSubjectResolved}
          className="bg-muted/40 text-sm"
        />
      </div>
      <div className="shrink-0 space-y-3 rounded-lg bg-muted/30 p-3">
        <div>
          <Label className="mb-2 block text-sm font-medium">
            Invoice due date
          </Label>
          <DatePicker value={invoiceDueDate} onChange={setInvoiceDueDate} />
        </div>
        <Separator />
      </div>
      <div
        className={cn(
          "flex flex-col rounded-lg bg-slate-100 p-4",
          isSideColumn && "min-h-0 flex-1",
        )}
      >
        <div className={emailFrameClass}>
          <EmailTemplateReminderContent
            reportData={reportData}
            formatService={formatService}
            workspaceLogoDataUrl=""
            workspaceName={workspaceName}
            clientDisplayName={clientDisplayName}
            clientAvatarDataUrl={null}
            dueDate={dueDateAsJsDate}
          />
        </div>
      </div>
    </>
  );

  const previewTitle = !selfManagedTabs
    ? activeTab === "invoice"
      ? "Invoice email preview"
      : "Reminder email preview"
    : "Email preview";

  return (
    <Card
      className={cn(
        "w-full min-h-0 border-dashed",
        isSideColumn && "flex h-full min-h-0 flex-col",
      )}
    >
      <CardHeader className={cn("pb-3", isSideColumn && "shrink-0")}>
        <CardTitle className="text-base">{previewTitle}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Same layout as cockpit email preview; sample totals and dates only.
        </p>
      </CardHeader>
      <CardContent
        className={cn(
          "pt-0",
          isSideColumn
            ? "flex min-h-0 flex-1 flex-col gap-3"
            : "space-y-4",
        )}
      >
        {selfManagedTabs ? (
          <Tabs
            value={internalTab}
            onValueChange={(v) => setInternalTab(v as ProjectEmailTemplateTab)}
            className={tabsShellClass}
          >
            <TabsList size="sm" className={cn("w-fit", isSideColumn && "shrink-0")}>
              <TabsTrigger value="invoice" size="sm">
                Invoice email
              </TabsTrigger>
              <TabsTrigger value="reminder" size="sm">
                Reminder email
              </TabsTrigger>
            </TabsList>
            <TabsContent value="invoice" className={paneClassName}>
              {invoicePane}
            </TabsContent>
            <TabsContent value="reminder" className={paneClassName}>
              {reminderPane}
            </TabsContent>
          </Tabs>
        ) : (
          <div className={tabsShellClass}>
            <div className={paneClassName}>
              {activeTab === "invoice" ? invoicePane : reminderPane}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
