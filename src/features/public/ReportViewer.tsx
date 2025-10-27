import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Calendar,
  Trash2,
  Eye,
  Download,
  ChevronDown,
  ChevronRight,
  Grid3X3,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { JsonTreeViewer } from "@/features/_common/JsonTreeViewer";
import { ReportData } from "./ReportExplorer";

interface ReportViewerProps {
  reports: ReportData[];
  onReportDelete: (reportId: string) => void;
  onViewCube?: (report: ReportData) => void;
}

export function ReportViewer({
  reports,
  onReportDelete,
  onViewCube,
}: ReportViewerProps) {
  const [expandedReports, setExpandedReports] = useState<Set<string>>(
    new Set(),
  );
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);

  // Check if a report is a serialized cube configuration
  const isSerializedCube = (report: ReportData) => {
    const data = report.data;
    return (
      data &&
      typeof data === "object" &&
      "config" in data &&
      "data" in data &&
      Array.isArray(data.config?.dimensions) &&
      Array.isArray(data.config?.measures)
    );
  };

  const toggleExpanded = (reportId: string) => {
    setExpandedReports((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const downloadReport = (report: ReportData) => {
    const dataStr = JSON.stringify(report.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = report.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (reports.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">No reports uploaded</h3>
        <p className="text-muted-foreground">
          Upload some JSON files to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <Card key={report.id} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">{report.name}</CardTitle>
                  <CardDescription className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(report.uploadedAt)}</span>
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadReport(report)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedReport(report)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
                {isSerializedCube(report) && onViewCube && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewCube(report)}
                  >
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    View Cube
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onReportDelete(report.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <Collapsible
            open={expandedReports.has(report.id)}
            onOpenChange={() => toggleExpanded(report.id)}
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-start">
                {expandedReports.has(report.id) ? (
                  <ChevronDown className="h-4 w-4 mr-2" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-2" />
                )}
                Preview Data
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <Separator />
              <CardContent className="pt-4">
                <JsonTreeViewer
                  data={report.data}
                  title="Data Preview"
                  className="h-64"
                  initiallyExpanded={false}
                />
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}

      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedReport.name}</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => setSelectedReport(null)}
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <JsonTreeViewer
                data={selectedReport.data}
                title="Report Data"
                className="h-96"
                initiallyExpanded={true}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
