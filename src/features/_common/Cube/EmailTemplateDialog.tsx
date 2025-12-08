import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EmailTemplateContent } from "./EmailTemplateContent";
import { EmailTemplateReminderContent } from "./EmailTemplateReminderContent";
import { CockpitCubeReportWithCreator } from "@/api/cockpit-cube-reports/cockpit-cube-reports.api.ts";
import { deserializeCubeConfig } from "@/features/_common/Cube/serialization/CubeSerialization";
import type { CubeDataItem } from "@/features/_common/Cube/CubeService.types";
import { SerializableCubeConfig } from "@/features/_common/Cube/serialization/CubeSerialization.types";
import { FormatService } from "@/services/FormatService/FormatService";
import { DatePicker } from "@/components/ui/date-picker";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { maybe, Maybe } from "@passionware/monads";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface EmailTemplateDialogProps {
  reportData: CockpitCubeReportWithCreator;
  reportLink?: string;
  children: React.ReactNode;
  formatService: FormatService;
  workspaceLogoDataUrl: string;
  workspaceName: string;
  clientDisplayName?: string;
  clientAvatarDataUrl?: string | null;
}

export function EmailTemplateDialog({
  reportData,
  reportLink,
  children,
  formatService,
  workspaceLogoDataUrl,
  workspaceName,
  clientDisplayName,
  clientAvatarDataUrl,
}: EmailTemplateDialogProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const reminderContentRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<"invoice" | "reminder">("invoice");
  const [sanitizedWorkspaceLogo, setSanitizedWorkspaceLogo] =
    useState(workspaceLogoDataUrl);
  const [sanitizedClientAvatar, setSanitizedClientAvatar] = useState<
    string | null | undefined
  >(clientAvatarDataUrl);
  const [invoiceDueDate, setInvoiceDueDate] = useState<Maybe<CalendarDate>>(
    maybe.of(today(getLocalTimeZone())),
  );

  const convertSvgDataUrlToPng = (dataUrl: string) =>
    new Promise<string>((resolve) => {
      try {
        const image = new Image();
        image.onload = () => {
          const width = image.naturalWidth || image.width || 100;
          const height = image.naturalHeight || image.height || 100;
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL("image/png"));
        };
        image.onerror = () => resolve(dataUrl);
        image.src = dataUrl;
      } catch {
        resolve(dataUrl);
      }
    });

  const ensurePngDataUrl = async (value?: string | null) => {
    if (!value) return value ?? null;
    if (!value.trim().startsWith("data:image/svg")) return value;
    return convertSvgDataUrlToPng(value);
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const [workspaceResult, clientResult] = await Promise.all([
        ensurePngDataUrl(workspaceLogoDataUrl),
        ensurePngDataUrl(clientAvatarDataUrl),
      ]);

      if (cancelled) return;
      setSanitizedWorkspaceLogo(workspaceResult || workspaceLogoDataUrl);
      setSanitizedClientAvatar(
        typeof clientResult === "string" ? clientResult : clientAvatarDataUrl,
      );
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceLogoDataUrl, clientAvatarDataUrl]);

  const selectContent = () => {
    try {
      const ref =
        activeTab === "invoice"
          ? contentRef.current
          : reminderContentRef.current;
      if (!ref) return;
      const range = document.createRange();
      range.selectNodeContents(ref);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    } catch {
      // ignore
    }
  };

  type CubeDataWithDateRange = {
    dateRange?: {
      start?: string | Date;
      end?: string | Date;
    };
  };

  const parseDateValue = (value: unknown) => {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value.getTime())) {
      return value;
    }
    const date = new Date(value as string);
    return isNaN(date.getTime()) ? null : date;
  };

  const getDateRange = (): { from: string; to: string } => {
    const formatDate = (date: Date | null) =>
      date ? formatService.temporal.date(date) : "";

    const startFromReport = parseDateValue(reportData.start_date);
    const endFromReport = parseDateValue(reportData.end_date);

    if (startFromReport && endFromReport) {
      return {
        from: formatDate(startFromReport),
        to: formatDate(endFromReport),
      };
    }

    const cubeDateRange = (
      reportData.cube_data as CubeDataWithDateRange | undefined
    )?.dateRange;
    if (cubeDateRange) {
      const start = parseDateValue(cubeDateRange.start);
      const end = parseDateValue(cubeDateRange.end);
      if (start && end) {
        return { from: formatDate(start), to: formatDate(end) };
      }
    }

    try {
      const cubeConfig = deserializeCubeConfig(
        reportData.cube_config as unknown as SerializableCubeConfig,
        reportData.cube_data.data as CubeDataItem[],
      );
      const items = cubeConfig.data as CubeDataItem[];
      const dates = items
        .map((i) => i.startAt)
        .filter(Boolean)
        .map((v) => new Date(v))
        .filter((d) => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

      return {
        from: formatDate(dates[0] || null),
        to: formatDate(dates[dates.length - 1] || null),
      };
    } catch {
      return { from: "", to: "" };
    }
  };

  const copySubject = async () => {
    const { from, to } = getDateRange();
    const subject = `Time & Billing Summary — ${from} to ${to}`;
    try {
      await navigator.clipboard.writeText(subject);
    } catch {
      // ignore
    }
  };

  const copyHtmlContent = async () => {
    const ref =
      activeTab === "invoice" ? contentRef.current : reminderContentRef.current;
    if (!ref) {
      return;
    }

    const html = ref.innerHTML;
    const selectAndExec = () => {
      selectContent();
      try {
        document.execCommand?.("copy");
      } catch {
        // ignore
      }
    };

    try {
      const clipboard = navigator.clipboard;
      const clipboardItemCtor =
        typeof window !== "undefined" && "ClipboardItem" in window
          ? (
              window as typeof window & {
                ClipboardItem: typeof ClipboardItem;
              }
            ).ClipboardItem
          : undefined;

      if (
        clipboard &&
        typeof clipboard.write === "function" &&
        clipboardItemCtor
      ) {
        const blob = new Blob([html], { type: "text/html" });
        const item = new clipboardItemCtor({ "text/html": blob });
        await clipboard.write([item]);
        return;
      }

      if (clipboard && typeof clipboard.writeText === "function") {
        await clipboard.writeText(html);
        return;
      }
    } catch {
      // ignore and fall back
    }

    selectAndExec();
  };

  const copySubjectContent = async () => {
    if (activeTab === "invoice") {
      await copySubject();
    } else {
      await copyReminderSubject();
    }
  };

  const copyReminderSubject = async () => {
    const { from, to } = getDateRange();
    const dueDateFormatted = maybe.mapOrElse(
      invoiceDueDate,
      (date: CalendarDate) => {
        const jsDate = new Date(date.year, date.month - 1, date.day);
        return formatService.temporal.date(jsDate);
      },
      "",
    );

    const subject = dueDateFormatted
      ? `Invoice Reminder — Payment Due ${dueDateFormatted}`
      : `Invoice Reminder — Time & Billing Summary ${from} to ${to}`;

    try {
      await navigator.clipboard.writeText(subject);
    } catch {
      // ignore
    }
  };

  const dueDateAsJsDate = maybe.mapOrElse(
    invoiceDueDate,
    (date: CalendarDate) => new Date(date.year, date.month - 1, date.day),
    null,
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex gap-0 flex-col">
        <DialogHeader className="flex flex-row items-center justify-between gap-4">
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">📧</span>
            Email Template
          </DialogTitle>
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "invoice" | "reminder")
            }
          >
            <TabsList size="sm" className="mr-6">
              <TabsTrigger value="invoice" size="sm">
                Invoice Email
              </TabsTrigger>
              <TabsTrigger value="reminder" size="sm">
                Reminder Email
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </DialogHeader>
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "invoice" | "reminder")
          }
          className="flex flex-col flex-1 min-h-0"
        >
          <TabsContent
            value="invoice"
            className="flex-1 min-h-0 bg-slate-100 p-4 flex items-start justify-center -mx-6 focus:outline-none"
          >
            <div
              className="bg-white rounded-lg shadow-sm p-6 max-w-4xl w-full overflow-y-auto max-h-full"
              ref={contentRef}
            >
              <EmailTemplateContent
                reportData={reportData}
                reportLink={reportLink}
                formatService={formatService}
                workspaceLogoDataUrl={sanitizedWorkspaceLogo}
                workspaceName={workspaceName}
                clientDisplayName={clientDisplayName}
                clientAvatarDataUrl={sanitizedClientAvatar}
              />
            </div>
          </TabsContent>
          <TabsContent
            value="reminder"
            className="flex-1 min-h-0 bg-slate-100 p-4 flex flex-col -mx-6 focus:outline-none"
          >
            <div className="space-y-4 flex-shrink-0">
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">
                  Invoice Due Date
                </label>
                <DatePicker
                  value={invoiceDueDate}
                  onChange={setInvoiceDueDate}
                />
              </div>
              <Separator orientation="horizontal" />
            </div>
            <div
              className="bg-white rounded-lg shadow-sm p-6 max-w-4xl w-full mx-auto overflow-y-auto flex-1 min-h-0"
              ref={reminderContentRef}
            >
              <EmailTemplateReminderContent
                reportData={reportData}
                reportLink={reportLink}
                formatService={formatService}
                workspaceLogoDataUrl={sanitizedWorkspaceLogo}
                workspaceName={workspaceName}
                clientDisplayName={clientDisplayName}
                clientAvatarDataUrl={sanitizedClientAvatar}
                dueDate={dueDateAsJsDate}
              />
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter className="flex gap-2 flex-shrink-0 pt-6">
          <Button
            variant="outline"
            onClick={copyHtmlContent}
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy email HTML
          </Button>
          <Button
            variant="outline"
            onClick={copySubjectContent}
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy subject
          </Button>
          <Button
            variant="default"
            onClick={selectContent}
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Select content
          </Button>
          {reportLink && (
            <Button variant="outline" asChild>
              <a href={reportLink} target="_blank" rel="noreferrer">
                <Link className="h-4 w-4 mr-2" />
                Open report
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
