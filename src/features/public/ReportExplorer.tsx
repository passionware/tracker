import { useState } from "react";
import { ReportUploader } from "./ReportUploader";
import { ReportViewer } from "./ReportViewer";
import { CubeViewer } from "./CubeViewer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WithFormatService } from "@/services/FormatService/FormatService";
import { WithServices } from "@/platform/typescript/services";

export interface ReportData {
  id: string;
  name: string;
  data: any;
  uploadedAt: Date;
}

export function ReportExplorer(props: WithServices<[WithFormatService]>) {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [viewingCube, setViewingCube] = useState<ReportData | null>(null);

  const handleReportUpload = (reportData: any, fileName: string) => {
    const newReport: ReportData = {
      id: Date.now().toString(),
      name: fileName,
      data: reportData,
      uploadedAt: new Date(),
    };
    setReports((prev) => [...prev, newReport]);
  };

  const handleReportDelete = (reportId: string) => {
    setReports((prev) => prev.filter((report) => report.id !== reportId));
  };

  const handleViewCube = (report: ReportData) => {
    setViewingCube(report);
  };

  const handleBackFromCube = () => {
    setViewingCube(null);
  };

  // If viewing a cube, show the cube viewer
  if (viewingCube) {
    return (
      <CubeViewer
        serializedConfig={viewingCube.data}
        title={viewingCube.name}
        onBack={handleBackFromCube}
        showBackButton={true}
        services={props.services}
      />
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Report Explorer</h1>
        <p className="text-muted-foreground">
          Upload and explore JSON report files
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload Reports</TabsTrigger>
          <TabsTrigger value="view">
            View Reports ({reports.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload JSON Reports</CardTitle>
              <CardDescription>
                Select JSON files to upload and parse for viewing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportUploader onReportUpload={handleReportUpload} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="view" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Reports</CardTitle>
              <CardDescription>
                View and explore your uploaded report data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportViewer
                reports={reports}
                onReportDelete={handleReportDelete}
                onViewCube={handleViewCube}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
