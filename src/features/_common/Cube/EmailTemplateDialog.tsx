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
import { useRef } from "react";
import { EmailTemplateContent } from "./EmailTemplateContent";
import { CockpitCubeReportWithCreator } from "@/api/cockpit-cube-reports/cockpit-cube-reports.api.ts";
import { deserializeCubeConfig } from "@/features/_common/Cube/serialization/CubeSerialization";
import type { CubeDataItem } from "@/features/_common/Cube/CubeService.types";
import { SerializableCubeConfig } from "@/features/_common/Cube/serialization/CubeSerialization.types";
import { FormatService } from "@/services/FormatService/FormatService";

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

  const selectContent = () => {
    try {
      if (!contentRef.current) return;
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
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
      const items = cubeConfig.data as any[];
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

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">📧</span>
            Email Template
          </DialogTitle>
        </DialogHeader>
        <div
          className="space-y-4 flex-1 overflow-y-auto min-h-0"
          ref={contentRef}
        >
          <EmailTemplateContent
            reportData={reportData}
            reportLink={reportLink}
            formatService={formatService}
            workspaceLogoDataUrl={workspaceLogoDataUrl}
            workspaceName={workspaceName}
            clientDisplayName={clientDisplayName}
            clientAvatarDataUrl={clientAvatarDataUrl}
          />
        </div>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={copySubject}
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
