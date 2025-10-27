import { WithFrontServices } from "@/core/frontServices.ts";
import { rd } from "@passionware/monads";
import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { ErrorMessageRenderer } from "@/platform/react/ErrorMessageRenderer.tsx";
import {
  FileText,
  Plus,
  GripVertical,
  Eye,
  Download,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { CockpitCubeReportWithCreator } from "@/api/cockpit-cube-reports/cockpit-cube-reports.api.ts";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import { deserializeCubeConfig } from "@/features/_common/Cube/serialization/CubeSerialization";
import { useCubeState } from "@/features/_common/Cube/useCubeState";
import { cubeService } from "@/features/_common/Cube/CubeService";
import type {
  DimensionDescriptor,
  MeasureDescriptor,
  CubeDataItem,
  CubeConfig,
} from "@/features/_common/Cube/CubeService.types";

// Types for PDF page configuration
interface PdfPageConfig {
  id: string;
  primaryDimension: string;
  secondaryDimension?: string;
  order: number;
}

interface PdfExportConfig {
  pages: PdfPageConfig[];
}

export function PdfExportBuilderPage(props: WithFrontServices) {
  const navigate = useNavigate();
  const { reportId } = useParams<{ reportId: string }>();
  const authState = props.services.cockpitAuthService.useAuth();
  const tenantId = rd.tryMap(authState, (auth) => auth.tenantId);

  const reports =
    props.services.clientCubeReportService.useCubeReports(tenantId);

  // Get tenant information for logo
  const tenantData = props.services.cockpitTenantService.useTenant(tenantId);

  // Helper function to extract available dimensions from cube data
  const getAvailableDimensions = useCallback((cubeData: any): string[] => {
    try {
      // Try to deserialize the cube config to get actual dimensions
      const cubeConfig = deserializeCubeConfig(
        cubeData.config || {},
        cubeData.data || [],
      );

      return cubeConfig.dimensions.map((dimension) => dimension.id);
    } catch (error) {
      console.warn("Failed to get dimensions from cube config:", error);
      // Fallback to common dimension IDs
      return ["contractor", "project", "task", "date"];
    }
  }, []);

  // Helper function to generate page title from dimensions
  const generatePageTitle = useCallback(
    (primaryDimension: string, secondaryDimension?: string): string => {
      // This will be used in the UI preview, actual titles are generated in PDF function
      const primary =
        primaryDimension.charAt(0).toUpperCase() + primaryDimension.slice(1);

      if (secondaryDimension) {
        const secondary =
          secondaryDimension.charAt(0).toUpperCase() +
          secondaryDimension.slice(1);
        return `By ${primary}, then by ${secondary}`;
      }

      return `By ${primary}`;
    },
    [],
  );

  // PDF configuration state
  const [pdfConfig, setPdfConfig] = useState<PdfExportConfig>({
    pages: [],
  });

  // State to track if we've initialized the default page
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize default page when reports are available
  React.useEffect(() => {
    if (!hasInitialized && reports && rd.isSuccess(reports)) {
      const reportsList = rd.tryMap(reports, (data) => data);

      if (reportsList && pdfConfig.pages.length === 0) {
        const report = reportsList.find((r: any) => r.id === reportId);

        if (report) {
          const availableDimensions = getAvailableDimensions(report.cube_data);
          const firstDimension = availableDimensions[0] || "contractor";

          const defaultPage: PdfPageConfig = {
            id: `page-${Date.now()}`,
            primaryDimension: firstDimension,
            order: 0,
          };

          setPdfConfig((prev) => ({
            ...prev,
            pages: [defaultPage],
          }));
          setHasInitialized(true);
        }
      }
    }
  }, [
    hasInitialized,
    reports,
    reportId,
    pdfConfig.pages.length,
    getAvailableDimensions,
  ]);

  const handleBack = () => {
    if (tenantId && reportId) {
      navigate(
        props.services.routingService
          .forClientCockpit()
          .forClient(tenantId)
          .forReport(reportId)
          .cubeViewer(),
      );
    }
  };

  const addPage = useCallback(() => {
    const newPage: PdfPageConfig = {
      id: `page-${Date.now()}`,
      primaryDimension: "",
      secondaryDimension: "",
      order: pdfConfig.pages.length,
    };

    setPdfConfig((prev) => ({
      ...prev,
      pages: [...prev.pages, newPage],
    }));
  }, [pdfConfig.pages.length]);

  const updatePage = useCallback(
    (pageId: string, updates: Partial<PdfPageConfig>) => {
      setPdfConfig((prev) => ({
        ...prev,
        pages: prev.pages.map((page) =>
          page.id === pageId ? { ...page, ...updates } : page,
        ),
      }));
    },
    [],
  );

  const removePage = useCallback((pageId: string) => {
    setPdfConfig((prev) => ({
      ...prev,
      pages: prev.pages.filter((page) => page.id !== pageId),
    }));
  }, []);

  const reorderPages = useCallback((fromIndex: number, toIndex: number) => {
    setPdfConfig((prev) => {
      const newPages = [...prev.pages];
      const [movedPage] = newPages.splice(fromIndex, 1);
      newPages.splice(toIndex, 0, movedPage);

      // Update order property
      return {
        ...prev,
        pages: newPages.map((page, index) => ({ ...page, order: index })),
      };
    });
  }, []);

  return rd
    .journey(reports)
    .wait(
      <div className="h-full p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>,
    )
    .catch((error) => (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <ErrorMessageRenderer error={error} />
      </div>
    ))
    .map((reportsList) => {
      const report = reportsList.find((r) => r.id === reportId);
      if (!report) {
        return (
          <div className="flex items-center justify-center min-h-[400px] p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Report Not Found
              </h3>
              <p className="text-gray-600 mb-4">
                The requested report could not be found.
              </p>
              <Button onClick={handleBack}>Back to Reports</Button>
            </div>
          </div>
        );
      }

      // PDF generation functions (defined inside component scope where report is available)
      const handleGeneratePdf = useCallback(async () => {
        if (pdfConfig.pages.length === 0) {
          toast.error("Please add at least one page before generating PDF");
          return;
        }

        try {
          const tenantLogoUrl =
            rd.tryMap(tenantData, (tenant) => tenant.logo_url) || undefined;
          const pdfDoc = await generatePdfDocument(
            pdfConfig,
            report,
            tenantLogoUrl,
          );
          const blob = await pdf(pdfDoc).toBlob();

          // Create download link
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${report.name || "Report"}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          toast.success("PDF generated and downloaded successfully");
        } catch (error) {
          console.error("Error generating PDF:", error);
          toast.error("Failed to generate PDF");
        }
      }, [pdfConfig, report]);

      const handlePreviewPdf = useCallback(async () => {
        if (pdfConfig.pages.length === 0) {
          toast.error("Please add at least one page before previewing PDF");
          return;
        }

        try {
          const tenantLogoUrl =
            rd.tryMap(tenantData, (tenant) => tenant.logo_url) || undefined;
          const pdfDoc = await generatePdfDocument(
            pdfConfig,
            report,
            tenantLogoUrl,
          );
          const blob = await pdf(pdfDoc).toBlob();

          // Open PDF in new tab for preview
          const url = URL.createObjectURL(blob);
          window.open(url, "_blank");

          toast.success("PDF preview opened in new tab");
        } catch (error) {
          console.error("Error previewing PDF:", error);
          toast.error("Failed to preview PDF");
        }
      }, [pdfConfig, report]);

      return (
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  PDF Export Builder
                </h1>
                <p className="text-gray-600">
                  Configure pages for "{report.name}"
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviewPdf}
                disabled={pdfConfig.pages.length === 0}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button
                size="sm"
                onClick={handleGeneratePdf}
                disabled={pdfConfig.pages.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Generate PDF
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar - Configuration */}
            <div className="w-80 border-r bg-gray-50 p-4 overflow-y-auto">
              <div className="space-y-4">
                {/* Report Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      Report Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Client Name
                      </Label>
                      <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md">
                        {report.name}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Provider
                      </Label>
                      <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md">
                        Passionware Consulting sp. z.o.o.
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Date Range
                      </Label>
                      <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md">
                        {report.start_date.toLocaleDateString()} -{" "}
                        {report.end_date.toLocaleDateString()}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Total Budget Billed
                      </Label>
                      <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md">
                        $12,450.00
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pages Management */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Pages</CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={addPage}
                        className="h-7 px-2"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Page
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {pdfConfig.pages.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No pages added yet</p>
                          <p className="text-xs">
                            Click "Add Page" to get started
                          </p>
                        </div>
                      ) : (
                        pdfConfig.pages
                          .sort((a, b) => a.order - b.order)
                          .map((page, index) => (
                            <PageConfigCard
                              key={page.id}
                              page={page}
                              index={index}
                              onUpdate={(updates) =>
                                updatePage(page.id, updates)
                              }
                              onRemove={() => removePage(page.id)}
                              onMoveUp={
                                index > 0
                                  ? () => reorderPages(index, index - 1)
                                  : undefined
                              }
                              onMoveDown={
                                index < pdfConfig.pages.length - 1
                                  ? () => reorderPages(index, index + 1)
                                  : undefined
                              }
                              report={report}
                            />
                          ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right Side - PDF Preview */}
            <div className="flex-1 p-6">
              <div className="h-full bg-gray-100 rounded-lg p-4 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                  {pdfConfig.pages.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        PDF Preview
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Configure pages on the left to see the preview here
                      </p>
                      <Badge variant="secondary">
                        {pdfConfig.pages.length} page
                        {pdfConfig.pages.length > 1 ? "s" : ""} configured
                      </Badge>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* PDF Header */}
                      <div className="bg-white rounded-lg shadow-sm border p-6">
                        <div className="text-center border-b pb-4 mb-4">
                          <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            {report.name || "Untitled Report"}
                          </h1>
                          <p className="text-gray-600 text-sm">
                            Passionware Consulting sp. z.o.o.
                          </p>
                          <p className="text-gray-500 text-xs mt-1">
                            {report.start_date.toLocaleDateString()} -{" "}
                            {report.end_date.toLocaleDateString()}
                          </p>
                          <div className="mt-2 text-xs text-gray-500">
                            Generated on {new Date().toLocaleDateString()}
                          </div>
                        </div>

                        {/* Table of Contents */}
                        <div className="mb-4">
                          <h2 className="text-lg font-semibold text-gray-900 mb-3">
                            Table of Contents
                          </h2>
                          <div className="space-y-1">
                            {pdfConfig.pages
                              .sort((a, b) => a.order - b.order)
                              .map((page, index) => (
                                <div
                                  key={page.id}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-gray-700">
                                    {index + 1}.{" "}
                                    {generatePageTitle(
                                      page.primaryDimension,
                                      page.secondaryDimension,
                                    )}
                                  </span>
                                  <span className="text-gray-500">
                                    Page {index + 1}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>

                      {/* Individual Pages Preview */}
                      {pdfConfig.pages
                        .sort((a, b) => a.order - b.order)
                        .map((page, index) => (
                          <PdfPagePreview
                            key={page.id}
                            page={page}
                            pageNumber={index + 1}
                            report={report}
                          />
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    });
}

// Data Table Preview Component
function DataTablePreview({
  page,
  report,
}: {
  page: PdfPageConfig;
  report: CockpitCubeReportWithCreator;
}) {
  const { cubeConfig, getDimensionDescriptor } = useCubeDescriptors(report);

  // Use cube state for proper cube calculation - following CubeViewer pattern
  const cubeState = useCubeState({
    data: cubeConfig.data,
    dimensions: cubeConfig.dimensions,
    measures: cubeConfig.measures,
    includeItems: true,
    rawDataDimension: {
      id: "raw-data",
      name: "Raw Data",
      icon: "Database",
      description: "View raw data entries",
      getValue: (item: CubeDataItem) => (item as any).id || item,
    },
    // Configure proper breakdown map for hierarchical grouping
    initialBreakdownMap: page.secondaryDimension
      ? new Map([
          ["", page.primaryDimension],
          [`${page.primaryDimension}:*`, page.secondaryDimension],
          [`${page.primaryDimension}:*:${page.secondaryDimension}:*`, null],
        ])
      : new Map([
          ["", page.primaryDimension],
          [`${page.primaryDimension}:*`, null],
        ]),
  });

  if (!page.primaryDimension) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Select dimensions to preview data</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-gray-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-700">
              {getDimensionDescriptor(page.primaryDimension)?.name ||
                page.primaryDimension}
            </th>
            {page.secondaryDimension && (
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                {getDimensionDescriptor(page.secondaryDimension)?.name ||
                  page.secondaryDimension}
              </th>
            )}
            {/* Show all available measures as columns */}
            {cubeConfig.measures.map((measure) => (
              <th
                key={measure.id}
                className="px-4 py-3 text-left font-medium text-gray-700"
              >
                {measure.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {cubeState.cube.groups.map((group, groupIndex) => (
            <React.Fragment key={groupIndex}>
              {/* Main group row */}
              <tr>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {group.dimensionLabel ||
                    String(group.dimensionValue) ||
                    "Total"}
                </td>
                {page.secondaryDimension && (
                  <td className="px-4 py-3 text-gray-600">
                    {group.subGroups && group.subGroups.length > 0
                      ? `${group.subGroups.length} sub-groups`
                      : "-"}
                  </td>
                )}
                {/* Show all available measures as columns */}
                {cubeConfig.measures.map((measure) => (
                  <td key={measure.id} className="px-4 py-3 text-gray-600">
                    {group.cells.find((cell) => cell.measureId === measure.id)
                      ?.value
                      ? measure.formatValue?.(
                          group.cells.find(
                            (cell) => cell.measureId === measure.id,
                          )!.value,
                        ) ||
                        String(
                          group.cells.find(
                            (cell) => cell.measureId === measure.id,
                          )!.value,
                        )
                      : "-"}
                  </td>
                ))}
              </tr>

              {/* Sub-groups rows */}
              {page.secondaryDimension &&
                group.subGroups &&
                group.subGroups.length > 0 && (
                  <>
                    {group.subGroups.map((subGroup, subIndex) => (
                      <tr
                        key={`${groupIndex}-${subIndex}`}
                        className="bg-gray-50"
                      >
                        <td className="px-4 py-2 text-sm text-gray-600 pl-8">
                          ↳{" "}
                          {subGroup.dimensionLabel ||
                            String(subGroup.dimensionValue)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">-</td>
                        {/* Show all available measures as columns */}
                        {cubeConfig.measures.map((measure) => (
                          <td
                            key={measure.id}
                            className="px-4 py-2 text-sm text-gray-600"
                          >
                            {subGroup.cells.find(
                              (cell) => cell.measureId === measure.id,
                            )?.value
                              ? measure.formatValue?.(
                                  subGroup.cells.find(
                                    (cell) => cell.measureId === measure.id,
                                  )!.value,
                                ) ||
                                String(
                                  subGroup.cells.find(
                                    (cell) => cell.measureId === measure.id,
                                  )!.value,
                                )
                              : "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Individual PDF page preview component
function PdfPagePreview({
  page,
  pageNumber,
  report,
}: {
  page: PdfPageConfig;
  pageNumber: number;
  report: CockpitCubeReportWithCreator;
}) {
  const generatePageTitle = (
    primaryDimension: string,
    secondaryDimension?: string,
  ): string => {
    const primary =
      primaryDimension.charAt(0).toUpperCase() + primaryDimension.slice(1);

    if (secondaryDimension) {
      const secondary =
        secondaryDimension.charAt(0).toUpperCase() +
        secondaryDimension.slice(1);
      return `By ${primary}, then by ${secondary}`;
    }

    return `By ${primary}`;
  };

  const getMeasurementIcon = (measurement: string) => {
    switch (measurement) {
      case "time":
        return "⏱️";
      case "cost":
        return "💰";
      case "revenue":
        return "📈";
      case "tasks":
        return "✅";
      default:
        return "📊";
    }
  };

  const getMeasurementColor = (measurement: string) => {
    switch (measurement) {
      case "time":
        return "bg-blue-100 text-blue-800";
      case "cost":
        return "bg-red-100 text-red-800";
      case "revenue":
        return "bg-green-100 text-green-800";
      case "tasks":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {generatePageTitle(page.primaryDimension, page.secondaryDimension)}
          </h2>
          <p className="text-sm text-gray-600">Page {pageNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          {page.primaryDimension && (
            <Badge className={getMeasurementColor(page.primaryDimension)}>
              {getMeasurementIcon(page.primaryDimension)} Primary:{" "}
              {page.primaryDimension}
            </Badge>
          )}
          {page.secondaryDimension && (
            <Badge variant="secondary" className="text-gray-600">
              {getMeasurementIcon(page.secondaryDimension)} Secondary:{" "}
              {page.secondaryDimension}
            </Badge>
          )}
        </div>
      </div>

      {/* Data Table Preview */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Data Preview
        </h3>
        <DataTablePreview page={page} report={report} />
      </div>

      {/* Sample Data Table */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Data Summary
        </h3>
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  Metric
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {page.primaryDimension && (
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {getMeasurementIcon(page.primaryDimension)}{" "}
                    {page.primaryDimension.charAt(0).toUpperCase() +
                      page.primaryDimension.slice(1)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    Primary measurement for breakdown analysis
                  </td>
                </tr>
              )}
              {page.secondaryDimension && (
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {getMeasurementIcon(page.secondaryDimension)}{" "}
                    {page.secondaryDimension.charAt(0).toUpperCase() +
                      page.secondaryDimension.slice(1)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    Secondary measurement for detailed breakdown
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Page Footer */}
      <div className="border-t pt-4 text-xs text-gray-500 text-center">
        Report: {report.name} • Generated on {new Date().toLocaleDateString()} •
        Page {pageNumber}
      </div>
    </div>
  );
}

// Hook to get cube descriptors from serialized cube data
function useCubeDescriptors(report: CockpitCubeReportWithCreator) {
  const cubeConfig = React.useMemo(() => {
    const config = deserializeCubeConfig(
      report.cube_config as any,
      report.cube_data.data as CubeDataItem[],
    );

    // Debug: Log the measures to see what's happening
    console.log(
      "Cube measures:",
      config.measures.map((m) => ({
        id: m.id,
        name: m.name,
        getValue: m.getValue.toString(),
        aggregate: m.aggregate.toString(),
        formatValue: m.formatValue?.toString(),
      })),
    );

    // Debug: Log sample data to see field values
    if (config.data.length > 0) {
      console.log("Sample data item:", config.data[0]);
      console.log("Sample data fields:", Object.keys(config.data[0]));
    }

    return config;
  }, [report.cube_config, report.cube_data.data]);

  const availableDimensions = React.useMemo(() => {
    return cubeConfig.dimensions.map((dimension) => dimension.id);
  }, [cubeConfig]);

  const getMeasureDescriptor = React.useCallback(
    (
      measureId: string,
    ): MeasureDescriptor<CubeDataItem, unknown> | undefined => {
      return cubeConfig.measures.find((m) => m.id === measureId);
    },
    [cubeConfig],
  );

  const getDimensionDescriptor = React.useCallback(
    (
      dimensionId: string,
    ): DimensionDescriptor<CubeDataItem, unknown> | undefined => {
      return cubeConfig.dimensions.find((d) => d.id === dimensionId);
    },
    [cubeConfig],
  );

  return {
    cubeConfig,
    availableDimensions,
    getMeasureDescriptor,
    getDimensionDescriptor,
  };
}

// Individual page configuration card
function PageConfigCard({
  page,
  index,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  report,
}: {
  page: PdfPageConfig;
  index: number;
  onUpdate: (updates: Partial<PdfPageConfig>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  report: CockpitCubeReportWithCreator;
}) {
  const { availableDimensions, getDimensionDescriptor } =
    useCubeDescriptors(report);

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
            <CardTitle className="text-sm">Page {index + 1}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {onMoveUp && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onMoveUp}
                className="h-6 w-6 p-0"
              >
                ↑
              </Button>
            )}
            {onMoveDown && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onMoveDown}
                className="h-6 w-6 p-0"
              >
                ↓
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onRemove}
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Primary Dimension</Label>
          <Select
            value={page.primaryDimension}
            onValueChange={(value) => onUpdate({ primaryDimension: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select dimension..." />
            </SelectTrigger>
            <SelectContent>
              {availableDimensions.map((dimensionId) => {
                // Try to get the dimension descriptor for proper name
                const dimensionDescriptor = getDimensionDescriptor(dimensionId);
                const displayName =
                  dimensionDescriptor?.name ||
                  dimensionId.charAt(0).toUpperCase() + dimensionId.slice(1);

                return (
                  <SelectItem key={dimensionId} value={dimensionId}>
                    {displayName}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Secondary Dimension (Optional)
          </Label>
          <Select
            value={page.secondaryDimension || undefined}
            onValueChange={(value) =>
              onUpdate({
                secondaryDimension: value === "none" ? undefined : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {availableDimensions.map((dimensionId) => {
                // Try to get the dimension descriptor for proper name
                const dimensionDescriptor = getDimensionDescriptor(dimensionId);
                const displayName =
                  dimensionDescriptor?.name ||
                  dimensionId.charAt(0).toUpperCase() + dimensionId.slice(1);

                return (
                  <SelectItem key={dimensionId} value={dimensionId}>
                    {displayName}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

// PDF Document Generation Function
async function generatePdfDocument(
  pdfConfig: PdfExportConfig,
  report: CockpitCubeReportWithCreator,
  tenantLogoUrl?: string,
) {
  const { Document, Page, Text, View, StyleSheet, Font, Image } = await import(
    "@react-pdf/renderer"
  );

  // Deserialize cube configuration to get dimensions and measures - following CubeViewer pattern
  const serializedConfig = {
    config: report.cube_config,
    data: report.cube_data.data,
  };

  const cubeConfig = deserializeCubeConfig(
    serializedConfig.config as any,
    serializedConfig.data as CubeDataItem[],
  );

  const dimensions = cubeConfig.dimensions;
  const measures = cubeConfig.measures;

  // Register fonts if needed
  Font.register({
    family: "Roboto",
    fonts: [
      {
        src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf",
        fontWeight: 300,
      },
      {
        src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf",
        fontWeight: 400,
      },
      {
        src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf",
        fontWeight: 500,
      },
      {
        src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
        fontWeight: 700,
      },
    ],
  });

  const styles = StyleSheet.create({
    page: {
      flexDirection: "column",
      backgroundColor: "#FFFFFF",
      padding: 30,
      fontFamily: "Roboto",
    },
    header: {
      textAlign: "center",
      marginBottom: 30,
      borderBottom: "2 solid #E5E7EB",
      paddingBottom: 20,
    },
    logoContainer: {
      alignItems: "center",
      marginBottom: 20,
    },
    logo: {
      width: 120,
      height: 60,
      objectFit: "contain",
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: "#111827",
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 14,
      color: "#6B7280",
      marginBottom: 5,
    },
    date: {
      fontSize: 12,
      color: "#9CA3AF",
    },
    toc: {
      marginBottom: 30,
    },
    tocTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#111827",
      marginBottom: 15,
    },
    tocItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 5,
      fontSize: 12,
    },
    pageBreak: {
      marginTop: 20,
      marginBottom: 20,
    },
    pageHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
      borderBottom: "1 solid #E5E7EB",
      paddingBottom: 10,
    },
    pageTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#111827",
    },
    pageNumber: {
      fontSize: 12,
      color: "#6B7280",
    },
    measurementBadge: {
      backgroundColor: "#F3F4F6",
      padding: "5 10",
      borderRadius: 4,
      fontSize: 10,
      color: "#374151",
      marginRight: 5,
    },
    chartPlaceholder: {
      height: 200,
      backgroundColor: "#F9FAFB",
      border: "2 dashed #D1D5DB",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
    },
    chartText: {
      fontSize: 14,
      color: "#6B7280",
    },
    dataTable: {
      marginBottom: 20,
    },
    tableTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: "#111827",
      marginBottom: 10,
    },
    table: {
      border: "1 solid #E5E7EB",
    },
    tableHeader: {
      backgroundColor: "#F9FAFB",
      flexDirection: "row",
    },
    tableBody: {
      flexDirection: "column",
    },
    tableRow: {
      flexDirection: "row",
      borderBottom: "1 solid #E5E7EB",
    },
    tableCell: {
      padding: 10,
      fontSize: 12,
      flex: 1,
    },
    tableHeaderCell: {
      fontWeight: "bold",
      color: "#374151",
    },
    tableBodyCell: {
      color: "#6B7280",
    },
    footer: {
      position: "absolute",
      bottom: 30,
      left: 30,
      right: 30,
      textAlign: "center",
      fontSize: 10,
      color: "#9CA3AF",
      borderTop: "1 solid #E5E7EB",
      paddingTop: 10,
    },
  });

  // Helper functions to work with cube descriptors
  const getMeasureDescriptor = (
    measureId: string,
  ): MeasureDescriptor<any, any> | undefined => {
    return measures.find((m) => m.id === measureId);
  };

  const getDimensionDescriptor = (
    dimensionId: string,
  ): DimensionDescriptor<any, any> | undefined => {
    return dimensions.find((d) => d.id === dimensionId);
  };

  const generatePageTitle = (
    primaryDimension: string,
    secondaryDimension?: string,
  ): string => {
    const primaryDim = getDimensionDescriptor(primaryDimension);
    const secondaryDim = secondaryDimension
      ? getDimensionDescriptor(secondaryDimension)
      : undefined;

    const primaryName = primaryDim?.name || primaryDimension;

    if (secondaryDim) {
      return `By ${primaryName}, then by ${secondaryDim.name}`;
    }

    return `By ${primaryName}`;
  };

  // Generate table breakdown for a page
  const generateTableBreakdown = (page: PdfPageConfig) => {
    const primaryDim = getDimensionDescriptor(page.primaryDimension);
    const secondaryDim = page.secondaryDimension
      ? getDimensionDescriptor(page.secondaryDimension)
      : undefined;

    if (!primaryDim) return null;

    // Create cube configuration for this page's breakdown
    // Use breakdownMap to properly configure hierarchical grouping
    const breakdownMap = new Map<string, string | null>();

    if (secondaryDim) {
      // Root level groups by primary dimension
      breakdownMap.set("", page.primaryDimension);
      // Primary dimension groups by secondary dimension
      breakdownMap.set(`${page.primaryDimension}:*`, page.secondaryDimension);
      // Secondary dimension shows raw data
      breakdownMap.set(
        `${page.primaryDimension}:*:${page.secondaryDimension}:*`,
        null,
      );
    } else {
      // Only primary dimension, show raw data at leaf level
      breakdownMap.set("", page.primaryDimension);
      breakdownMap.set(`${page.primaryDimension}:*`, null);
    }

    const pageConfig: CubeConfig<CubeDataItem> = {
      data: cubeConfig.data,
      dimensions: cubeConfig.dimensions,
      measures: cubeConfig.measures,
      filters: cubeConfig.filters || [],
      nodeStates: new Map(),
      breakdownMap,
      activeMeasures: cubeConfig.measures.map((m) => m.id).filter(Boolean),
    };

    const cube = cubeService.calculateCube(pageConfig, { includeItems: true });

    return cube;
  };

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {tenantLogoUrl && (
            <View style={styles.logoContainer}>
              <Image src={tenantLogoUrl} style={styles.logo} />
            </View>
          )}
          <Text style={styles.title}>{report.name}</Text>
          <Text style={styles.subtitle}>Passionware Consulting sp. z.o.o.</Text>
          <Text style={styles.subtitle}>
            {report.start_date.toLocaleDateString()} -{" "}
            {report.end_date.toLocaleDateString()}
          </Text>
          <Text style={styles.date}>
            Generated on {new Date().toLocaleDateString()}
          </Text>
        </View>

        {/* Table of Contents */}
        <View style={styles.toc}>
          <Text style={styles.tocTitle}>Table of Contents</Text>
          {pdfConfig.pages
            .sort((a, b) => a.order - b.order)
            .map((page, index) => {
              const pageTitle = generatePageTitle(
                page.primaryDimension,
                page.secondaryDimension,
              );
              return (
                <View key={page.id} style={styles.tocItem}>
                  <Text>
                    {index + 1}. {pageTitle}
                  </Text>
                  <Text>Page {index + 2}</Text>
                </View>
              );
            })}
        </View>
      </Page>

      {/* Individual Pages */}
      {pdfConfig.pages
        .sort((a, b) => a.order - b.order)
        .map((page, index) => {
          const pageTitle = generatePageTitle(
            page.primaryDimension,
            page.secondaryDimension,
          );
          const cubeBreakdown = generateTableBreakdown(page);

          return (
            <Page key={page.id} size="A4" style={styles.page}>
              {/* Page Header */}
              <View style={styles.pageHeader}>
                <Text style={styles.pageTitle}>{pageTitle}</Text>
                <Text style={styles.pageNumber}>Page {index + 2}</Text>
              </View>

              {/* Data Table */}
              {cubeBreakdown && (
                <View style={styles.table}>
                  {/* Table Header */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableCell, styles.tableHeaderCell]}>
                      {getDimensionDescriptor(page.primaryDimension)?.name ||
                        page.primaryDimension}
                    </Text>
                    {page.secondaryDimension && (
                      <Text style={[styles.tableCell, styles.tableHeaderCell]}>
                        {getDimensionDescriptor(page.secondaryDimension)
                          ?.name || page.secondaryDimension}
                      </Text>
                    )}
                    {/* Show all available measures as columns */}
                    {measures.map((measure) => (
                      <Text
                        key={measure.id}
                        style={[styles.tableCell, styles.tableHeaderCell]}
                      >
                        {measure.name}
                      </Text>
                    ))}
                  </View>

                  {/* Table Rows */}
                  <View style={styles.tableBody}>
                    {cubeBreakdown.groups.map((group, groupIndex) => (
                      <React.Fragment key={groupIndex}>
                        {/* Main group row */}
                        <View style={styles.tableRow}>
                          <Text
                            style={[styles.tableCell, styles.tableBodyCell]}
                          >
                            {group.dimensionLabel ||
                              String(group.dimensionValue) ||
                              "Total"}
                          </Text>
                          {page.secondaryDimension && (
                            <Text
                              style={[styles.tableCell, styles.tableBodyCell]}
                            >
                              {group.subGroups && group.subGroups.length > 0
                                ? `${group.subGroups.length} sub-groups`
                                : "-"}
                            </Text>
                          )}
                          {/* Show all available measures as columns */}
                          {measures.map((measure) => (
                            <Text
                              key={measure.id}
                              style={[styles.tableCell, styles.tableBodyCell]}
                            >
                              {group.cells.find(
                                (cell) => cell.measureId === measure.id,
                              )?.value
                                ? measure.formatValue?.(
                                    group.cells.find(
                                      (cell) => cell.measureId === measure.id,
                                    )!.value,
                                  ) ||
                                  String(
                                    group.cells.find(
                                      (cell) => cell.measureId === measure.id,
                                    )!.value,
                                  )
                                : "-"}
                            </Text>
                          ))}
                        </View>

                        {/* Sub-groups rows */}
                        {page.secondaryDimension &&
                          group.subGroups &&
                          group.subGroups.length > 0 && (
                            <>
                              {group.subGroups.map((subGroup, subIndex) => (
                                <View
                                  key={`${groupIndex}-${subIndex}`}
                                  style={[
                                    styles.tableRow,
                                    { backgroundColor: "#f9fafb" },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.tableCell,
                                      styles.tableBodyCell,
                                      { paddingLeft: 20, fontSize: 10 },
                                    ]}
                                  >
                                    ↳{" "}
                                    {subGroup.dimensionLabel ||
                                      String(subGroup.dimensionValue)}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.tableCell,
                                      styles.tableBodyCell,
                                      { fontSize: 10 },
                                    ]}
                                  >
                                    -
                                  </Text>
                                  {/* Show all available measures as columns */}
                                  {measures.map((measure) => (
                                    <Text
                                      key={measure.id}
                                      style={[
                                        styles.tableCell,
                                        styles.tableBodyCell,
                                        { fontSize: 10 },
                                      ]}
                                    >
                                      {subGroup.cells.find(
                                        (cell) => cell.measureId === measure.id,
                                      )?.value
                                        ? measure.formatValue?.(
                                            subGroup.cells.find(
                                              (cell) =>
                                                cell.measureId === measure.id,
                                            )!.value,
                                          ) ||
                                          String(
                                            subGroup.cells.find(
                                              (cell) =>
                                                cell.measureId === measure.id,
                                            )!.value,
                                          )
                                        : "-"}
                                    </Text>
                                  ))}
                                </View>
                              ))}
                            </>
                          )}
                      </React.Fragment>
                    ))}
                  </View>
                </View>
              )}

              {/* Page Footer */}
              <Text style={styles.footer}>
                Report: {report.name} • Generated on{" "}
                {new Date().toLocaleDateString()} • Page {index + 2}
              </Text>
            </Page>
          );
        })}
    </Document>
  );
}
