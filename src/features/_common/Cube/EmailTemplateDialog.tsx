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
}

export function EmailTemplateDialog({
  reportData,
  reportLink,
  children,
  formatService,
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

  const getDateRange = (): { from: string; to: string } => {
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
      const fmt = (d: Date | undefined) =>
        d ? formatService.temporal.date(d) : "";
      return { from: fmt(dates[0]), to: fmt(dates[dates.length - 1]) };
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
