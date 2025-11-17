import { WithFrontServices } from "@/core/frontServices.ts";
import { maybe, rd } from "@passionware/monads";
import React, { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { EmailTemplateDialog } from "@/features/_common/Cube/EmailTemplateDialog";
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
  Plus,
  GripVertical,
  Eye,
  Download,
  ArrowLeft,
  Trash2,
  Mail,
} from "lucide-react";
import { CockpitCubeReportWithCreator } from "@/api/cockpit-cube-reports/cockpit-cube-reports.api.ts";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import { deserializeCubeConfig } from "@/features/_common/Cube/serialization/CubeSerialization";
import type {
  DimensionDescriptor,
  MeasureDescriptor,
  CubeDataItem,
} from "@/features/_common/Cube/CubeService.types";
import { PDFReportModelUtils } from "../models/PDFReportModel";
import type { PDFReportModel, PDFPageConfig } from "../models/PDFReportModel";
import { PDFPreview, PDFPreviewEmpty } from "../components/PDFPreview";
import { generatePDFDocument } from "../components/PDFDocument";
import { SerializableCubeConfig } from "@/features/_common/Cube/serialization/CubeSerialization.types";
import { CockpitTenant } from "@/api/cockpit-tenants/cockpit-tenants.api";
import { FormatService } from "@/services/FormatService/FormatService";
import passionwareLogoRaw from "./passionware.png?inline";

// Use the domain model types
type PdfPageConfig = PDFPageConfig;

interface PdfExportConfig {
  pages: PdfPageConfig[];
}

export function PdfExportBuilderPage(props: WithFrontServices) {
  const navigate = useNavigate();
  const { reportId } = useParams<{ reportId: string }>();
  const authState = props.services.cockpitAuthService.useAuth();
  const tenantId = rd.mapOrElse(authState, (auth) => auth.tenantId, null);
  const isAdmin = rd.tryGet(authState)?.role === "admin";

  const report = props.services.clientCubeReportService.useCubeReport(
    maybe.getOrNull(reportId),
  );

  // Get tenant information for logo
  const tenantData = props.services.cockpitTenantService.useTenant(tenantId);
  const tenantInfo = rd.tryGet(tenantData);
  const clientDisplayName = tenantInfo?.name;
  const clientAvatarDataUrl = tenantInfo?.logo_url;

  // PDF configuration state
  const [pdfConfig, setPdfConfig] = useState<PdfExportConfig>({
    pages: [],
  });

  // State to track if we've initialized the default page
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize default page when report is available
  React.useEffect(() => {
    if (!hasInitialized && report && rd.isSuccess(report)) {
      if (pdfConfig.pages.length === 0) {
        const config = report.data
          .cube_config as unknown as SerializableCubeConfig;

        const contractorDimension = config.dimensions.find(
          (d) => d.id === "contractor",
        );
        const taskDimension = config.dimensions.find((d) => d.id === "task");

        const pages: PdfPageConfig[] = [];
        const timestamp = Date.now();

        if (contractorDimension) {
          pages.push({
            id: `page-${timestamp}-1`,
            order: 0,
            primaryDimension: {
              id: contractorDimension.id,
              name: contractorDimension.name,
            },
            secondaryDimension: taskDimension
              ? {
                  id: taskDimension.id,
                  name: taskDimension.name,
                }
              : undefined,
            sorting: {
              primarySortBy: "hours",
              primarySortOrder: "desc",
              secondarySortBy: "hours",
              secondarySortOrder: "desc",
            },
          });
        }

        if (taskDimension) {
          pages.push({
            id: `page-${timestamp}-2`,
            order: pages.length,
            primaryDimension: {
              id: taskDimension.id,
              name: taskDimension.name,
            },
            secondaryDimension: contractorDimension
              ? {
                  id: contractorDimension.id,
                  name: contractorDimension.name,
                }
              : undefined,
            sorting: {
              primarySortBy: "hours",
              primarySortOrder: "desc",
              secondarySortBy: "hours",
              secondarySortOrder: "desc",
            },
          });
        }

        if (pages.length > 0) {
          setPdfConfig((prev) => ({
            ...prev,
            pages,
          }));
        }

        setHasInitialized(true);
      }
    }
  }, [hasInitialized, report, reportId, pdfConfig.pages.length]);

  const handleBack = () => {
    if (tenantId && reportId) {
      navigate(
        props.services.routingService
          .forClientCockpit()
          .forClient(tenantId?.toString())
          .forReport(reportId)
          .cubeViewer(),
      );
    }
  };

  const addPage = () => {
    const newPage: PdfPageConfig = {
      id: `page-${Date.now()}`,
      order: pdfConfig.pages.length,
      primaryDimension: {
        id: "contractor",
        name: "Contractor",
      },
      sorting: {
        primarySortBy: "hours",
        primarySortOrder: "desc",
      },
    };

    setPdfConfig((prev) => ({
      ...prev,
      pages: [...prev.pages, newPage],
    }));
  };

  const updatePage = (pageId: string, updates: Partial<PdfPageConfig>) => {
    setPdfConfig((prev) => ({
      ...prev,
      pages: prev.pages.map((page) =>
        page.id === pageId ? { ...page, ...updates } : page,
      ),
    }));
  };

  const removePage = (pageId: string) => {
    setPdfConfig((prev) => ({
      ...prev,
      pages: prev.pages.filter((page) => page.id !== pageId),
    }));
  };

  // PDF generation functions - simple functions without useCallback optimization
  const handleGeneratePdf = async (
    reportData: CockpitCubeReportWithCreator,
  ) => {
    if (pdfConfig.pages.length === 0) {
      toast.error("Please add at least one page before generating PDF");
      return;
    }

    try {
      // Build the PDF report model
      const pdfReportModel = await PDFReportModelUtils.fromCubeReport(
        reportData,
        pdfConfig,
        props.services.formatService,
        rd.getOrThrow(tenantData, "Tenant data is required"),
      );

      const pdfDoc = await generatePDFDocument(
        pdfReportModel,
        props.services.formatService,
      );
      const blob = await pdf(pdfDoc).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportData.name || "Report"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDF generated and downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const handlePreviewPdf = async (reportData: CockpitCubeReportWithCreator) => {
    if (pdfConfig.pages.length === 0) {
      toast.error("Please add at least one page before previewing PDF");
      return;
    }

    try {
      // Build the PDF report model
      const pdfReportModel = await PDFReportModelUtils.fromCubeReport(
        reportData,
        pdfConfig,
        props.services.formatService,
        rd.getOrThrow(tenantData, "Tenant data is required"),
      );

      const pdfDoc = await generatePDFDocument(
        pdfReportModel,
        props.services.formatService,
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
  };

  return rd
    .journey(report)
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
    .map((reportData) => {
      if (!reportData) {
        return (
          <div className="flex items-center justify-center min-h-[400px] p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Report Not Found
              </h3>
              <p className="text-gray-600 mb-4">
                The requested report could not be found.
              </p>
              <Button onClick={handleBack}>Back to Cube</Button>
            </div>
          </div>
        );
      }

      return (
        <div className="h-screen flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-xl font-semibold text-slate-900">
                    PDF Export Builder
                  </h1>
                  <p className="text-sm text-slate-600">
                    Configure pages for "{reportData.name}"
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handlePreviewPdf(reportData)}
                  disabled={pdfConfig.pages.length === 0}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview PDF
                </Button>
                <Button
                  onClick={() => handleGeneratePdf(reportData)}
                  disabled={pdfConfig.pages.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Generate PDF
                </Button>
                {isAdmin && (
                  <EmailTemplateDialog
                    reportData={reportData}
                    reportLink={
                      window.location.origin +
                      props.services.routingService
                        .forClientCockpit()
                        .forClient(tenantId?.toString())
                        .forReport(reportId)
                        .cubeViewer()
                    }
                    formatService={props.services.formatService}
                    workspaceLogoDataUrl={passionwareLogoRaw}
                    workspaceName="Passionware"
                    clientDisplayName={clientDisplayName}
                    clientAvatarDataUrl={clientAvatarDataUrl}
                  >
                    <Button variant="outline">
                      <Mail className="h-4 w-4 mr-2" />
                      Email template
                    </Button>
                  </EmailTemplateDialog>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Left Panel - Configuration */}
            <div className="w-1/3 border-r bg-white p-6 overflow-y-auto">
              <div className="space-y-6">
                {/* Pages Configuration */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Pages</CardTitle>
                      <Button size="sm" onClick={addPage}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Page
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pdfConfig.pages.map((page, index) => (
                        <PageConfigCard
                          key={page.id}
                          page={page}
                          index={index}
                          report={reportData}
                          onUpdate={(updates) => updatePage(page.id, updates)}
                          onRemove={() => removePage(page.id)}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right Panel - Preview */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-6 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900">
                  PDF Preview
                </h2>
                <p className="text-sm text-gray-600">
                  Preview how your PDF will look
                </p>
              </div>
              <div className="flex-1 bg-gray-100 p-6 overflow-y-auto min-h-0">
                <div className="max-w-4xl mx-auto">
                  {pdfConfig.pages.length === 0 ? (
                    <PDFPreviewEmpty />
                  ) : (
                    rd.tryMap(tenantData, (tenantData) => (
                      <PDFPreviewWrapper
                        pdfConfig={pdfConfig}
                        report={reportData}
                        tenantData={tenantData}
                        formatService={props.services.formatService}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    });
}

// Individual page configuration card
function PageConfigCard({
  page,
  index,
  report,
  onUpdate,
  onRemove,
}: {
  page: PdfPageConfig;
  index: number;
  report: CockpitCubeReportWithCreator;
  onUpdate: (updates: Partial<PdfPageConfig>) => void;
  onRemove: () => void;
}) {
  const {
    availableDimensions,
    availableMeasures,
    getDimensionDescriptor,
    getMeasureDescriptor,
  } = useCubeDescriptors(report);

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium">Page {index + 1}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dimension 1: Primary Dimension */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Dimension 1 (Primary)</Label>
            <Select
              value={page.primaryDimension.id}
              onValueChange={(value) => {
                const dimension = getDimensionDescriptor(value);
                if (dimension) {
                  onUpdate({
                    primaryDimension: {
                      id: value,
                      name: dimension.name,
                    },
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableDimensions.map((dimensionId) => {
                  const dimension = getDimensionDescriptor(dimensionId);
                  return (
                    <SelectItem key={dimensionId} value={dimensionId}>
                      {dimension?.name || dimensionId}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Primary Dimension Sorting */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600">
              Sort by measure
            </Label>
            <div className="flex gap-2">
              <Select
                value={page.sorting?.primarySortBy || availableMeasures[0]}
                onValueChange={(value) => {
                  onUpdate({
                    sorting: {
                      ...page.sorting,
                      primarySortBy: value,
                    },
                  });
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select measure" />
                </SelectTrigger>
                <SelectContent>
                  {availableMeasures.map((measureId) => {
                    const measure = getMeasureDescriptor(measureId);
                    return (
                      <SelectItem key={measureId} value={measureId}>
                        {measure?.name || measureId}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Select
                value={page.sorting?.primarySortOrder || "desc"}
                onValueChange={(value) => {
                  onUpdate({
                    sorting: {
                      ...page.sorting,
                      primarySortOrder: value as "asc" | "desc",
                    },
                  });
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">↓</SelectItem>
                  <SelectItem value="asc">↑</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Dimension 2: Secondary Dimension */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Dimension 2 (Secondary - Optional)
            </Label>
            <Select
              value={page.secondaryDimension?.id || "none"}
              onValueChange={(value) => {
                if (value && value !== "none") {
                  const dimension = getDimensionDescriptor(value);
                  if (dimension) {
                    onUpdate({
                      secondaryDimension: {
                        id: value,
                        name: dimension.name,
                      },
                    });
                  }
                } else {
                  onUpdate({ secondaryDimension: undefined });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select secondary dimension" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {availableDimensions
                  .filter(
                    (dimensionId) => dimensionId !== page.primaryDimension.id,
                  )
                  .map((dimensionId) => {
                    const dimension = getDimensionDescriptor(dimensionId);
                    return (
                      <SelectItem key={dimensionId} value={dimensionId}>
                        {dimension?.name || dimensionId}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>

          {/* Secondary Dimension Sorting - Only show if secondary dimension is selected */}
          {page.secondaryDimension && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600">
                Sort by measure
              </Label>
              <div className="flex gap-2">
                <Select
                  value={page.sorting?.secondarySortBy || availableMeasures[0]}
                  onValueChange={(value) => {
                    onUpdate({
                      sorting: {
                        ...page.sorting,
                        secondarySortBy: value,
                      },
                    });
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select measure" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMeasures.map((measureId) => {
                      const measure = getMeasureDescriptor(measureId);
                      return (
                        <SelectItem key={measureId} value={measureId}>
                          {measure?.name || measureId}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Select
                  value={page.sorting?.secondarySortOrder || "desc"}
                  onValueChange={(value) => {
                    onUpdate({
                      sorting: {
                        ...page.sorting,
                        secondarySortOrder: value as "asc" | "desc",
                      },
                    });
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">↓</SelectItem>
                    <SelectItem value="asc">↑</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Hook to get cube descriptors from serialized cube data
function useCubeDescriptors(reportData: CockpitCubeReportWithCreator) {
  const cubeConfig = React.useMemo(() => {
    const config = deserializeCubeConfig(
      reportData.cube_config as unknown as SerializableCubeConfig,
      reportData.cube_data.data as CubeDataItem[],
    );

    return config;
  }, [reportData.cube_config, reportData.cube_data.data]);

  const availableDimensions = React.useMemo(() => {
    return cubeConfig.dimensions.map((dimension) => dimension.id);
  }, [cubeConfig]);

  const availableMeasures = React.useMemo(() => {
    return cubeConfig.measures.map((measure) => measure.id);
  }, [cubeConfig]);

  const getMeasureDescriptor = (
    measureId: string,
  ): MeasureDescriptor<CubeDataItem, unknown> | undefined => {
    return cubeConfig.measures.find((m) => m.id === measureId);
  };

  const getDimensionDescriptor = (
    dimensionId: string,
  ): DimensionDescriptor<CubeDataItem, unknown> | undefined => {
    return cubeConfig.dimensions.find((d) => d.id === dimensionId);
  };

  return {
    cubeConfig,
    availableDimensions,
    availableMeasures,
    getMeasureDescriptor,
    getDimensionDescriptor,
  };
}

// Wrapper component that builds the PDF model and renders the preview
function PDFPreviewWrapper({
  pdfConfig,
  report,
  tenantData,
  formatService,
}: {
  pdfConfig: PdfExportConfig;
  report: CockpitCubeReportWithCreator;
  tenantData: CockpitTenant;
  formatService: FormatService;
}) {
  const [pdfReportModel, setPdfReportModel] =
    React.useState<PDFReportModel | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const buildModel = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const model = await PDFReportModelUtils.fromCubeReport(
          report,
          pdfConfig,
          formatService,
          tenantData,
        );

        setPdfReportModel(model);
      } catch (err) {
        console.error("Error building PDF model:", err);
        setError("Failed to build PDF preview");
      } finally {
        setIsLoading(false);
      }
    };

    buildModel();
  }, [pdfConfig, report, tenantData, formatService]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Building PDF preview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">⚠️</div>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!pdfReportModel) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No preview available</p>
      </div>
    );
  }

  return (
    <PDFPreview pdfReportModel={pdfReportModel} formatService={formatService} />
  );
}
