/**
 * Export Builder Page
 *
 * Dedicated page for configuring cube exports with:
 * - Dimension editing (exclude, reorder)
 * - Measure editing (exclude, reorder)
 * - Raw data configuration
 * - Data flattening/normalization
 * - Real-time preview
 * - JSON export download
 */

import { Button } from "@/components/ui/button.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Download, Eye, ArrowLeft } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type {
  DimensionDescriptor,
  MeasureDescriptor,
  CubeDataItem,
} from "@/features/_common/Cube/CubeService.types.ts";
import { serializeCubeConfig } from "@/features/_common/Cube/serialization/CubeSerialization.ts";
import { CubeProvider } from "@/features/_common/Cube/CubeContext.tsx";
import { useCubeState } from "@/features/_common/Cube/useCubeState.ts";
import { CubeView } from "@/features/_common/Cube/CubeView.tsx";
import { StoryLayoutWrapper } from "@/features/_common/Cube/StoryLayoutWrapper.tsx";
import { useReportCube } from "./useReportCube";
import type { WithFrontServices } from "@/core/frontServices.ts";
import { maybe, rd } from "@passionware/monads";
import type { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import type {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";

export interface ExportBuilderPageProps extends WithFrontServices {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  projectId: number;
  projectIterationId: ProjectIteration["id"];
  reportId: GeneratedReportSource["id"];
}

// Inner component that handles the cube logic when report is ready
function ExportBuilderContent({
  report,
  services,
  onNavigateBack,
}: {
  report: GeneratedReportSource;
  services: WithFrontServices["services"];
  onNavigateBack: () => void;
}) {
  const [selectedDimensions, setSelectedDimensions] = useState<
    DimensionDescriptor<CubeDataItem, unknown>[]
  >([]);
  const [selectedMeasures, setSelectedMeasures] = useState<
    MeasureDescriptor<CubeDataItem, unknown>[]
  >([]);
  const [rawDataDimension, setRawDataDimension] = useState<DimensionDescriptor<
    CubeDataItem,
    unknown
  > | null>(null);
  const [flatteningConfig, setFlatteningConfig] = useState<{
    enabled: boolean;
    flattenDimensions: string[];
    aggregationMethod: "sum" | "average" | "count";
  }>({
    enabled: false,
    flattenDimensions: [],
    aggregationMethod: "sum",
  });

  // Use the shared cube hook to get all cube data
  const { cubeState, dimensions, measures, data } = useReportCube({
    report,
    services,
  });

  // Initialize selected dimensions and measures when cube data is available
  useState(() => {
    if (dimensions.length > 0 && selectedDimensions.length === 0) {
      setSelectedDimensions(dimensions);
    }
    if (measures.length > 0 && selectedMeasures.length === 0) {
      setSelectedMeasures(measures);
    }
  });

  // Generate preview cube state
  const previewCubeState = useMemo(() => {
    if (!rawDataDimension) return null;

    return useCubeState({
      data,
      dimensions: selectedDimensions,
      measures: selectedMeasures,
      initialGrouping: cubeState.cube.config.initialGrouping,
      includeItems: true,
      rawDataDimension,
    });
  }, [data, selectedDimensions, selectedMeasures, rawDataDimension, cubeState]);

  // Generate serializable config
  const serializableConfig = useMemo(() => {
    if (!previewCubeState) return null;

    const config = {
      data,
      dimensions: selectedDimensions,
      measures: selectedMeasures,
      breakdownMap: previewCubeState.cube.config.breakdownMap,
      initialGrouping: previewCubeState.cube.config.initialGrouping,
      activeMeasures: previewCubeState.cube.config.activeMeasures,
    };

    return serializeCubeConfig(config);
  }, [previewCubeState, data, selectedDimensions, selectedMeasures]);

  const handleExport = useCallback(() => {
    if (!serializableConfig) return;

    const jsonString = JSON.stringify(serializableConfig, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `cube-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [serializableConfig]);

  const handleBack = () => {
    onNavigateBack();
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Cube View
            </Button>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                Export Builder
              </h1>
              <p className="text-sm text-slate-600">
                Configure and export your cube data
              </p>
            </div>
          </div>

          <Button
            onClick={handleExport}
            disabled={!serializableConfig}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 min-h-0">
        {/* Configuration Panel */}
        <div className="flex-1 lg:w-1/2 lg:max-w-lg">
          <Tabs defaultValue="flattening" className="h-full flex flex-col">
            <TabsList className="flex-shrink-0">
              <TabsTrigger value="flattening">Flattening</TabsTrigger>
              <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
              <TabsTrigger value="measures">Measures</TabsTrigger>
              <TabsTrigger value="raw-data">Raw Data</TabsTrigger>
            </TabsList>

            <TabsContent value="flattening" className="flex-1 overflow-y-auto">
              <div className="space-y-4 p-4">
                <h3 className="text-lg font-semibold">Data Flattening</h3>
                <p className="text-sm text-slate-600">
                  Flatten data for pre-aggregation (e.g., merge daily entries)
                </p>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enable-flattening"
                      checked={flatteningConfig.enabled}
                      onCheckedChange={(checked) =>
                        setFlatteningConfig((prev) => ({
                          ...prev,
                          enabled: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor="enable-flattening">
                      Enable data flattening
                    </Label>
                  </div>

                  {flatteningConfig.enabled && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Flatten by dimensions:
                      </Label>
                      {dimensions.map((dim) => (
                        <div
                          key={dim.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`flatten-${dim.id}`}
                            checked={flatteningConfig.flattenDimensions.includes(
                              dim.id,
                            )}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFlatteningConfig((prev) => ({
                                  ...prev,
                                  flattenDimensions: [
                                    ...prev.flattenDimensions,
                                    dim.id,
                                  ],
                                }));
                              } else {
                                setFlatteningConfig((prev) => ({
                                  ...prev,
                                  flattenDimensions:
                                    prev.flattenDimensions.filter(
                                      (id) => id !== dim.id,
                                    ),
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={`flatten-${dim.id}`}>
                            {dim.name}
                          </Label>
                        </div>
                      ))}

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Aggregation Method
                        </Label>
                        <Select
                          value={flatteningConfig.aggregationMethod}
                          onValueChange={(value) =>
                            setFlatteningConfig((prev) => ({
                              ...prev,
                              aggregationMethod: value as
                                | "sum"
                                | "average"
                                | "count",
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sum">Sum</SelectItem>
                            <SelectItem value="average">Average</SelectItem>
                            <SelectItem value="count">Count</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="dimensions" className="flex-1 overflow-y-auto">
              <div className="space-y-4 p-4">
                <h3 className="text-lg font-semibold">
                  Dimension Configuration
                </h3>
                <p className="text-sm text-slate-600">
                  Select and reorder dimensions for your export
                </p>

                <div className="space-y-2">
                  {dimensions.map((dim) => (
                    <div
                      key={dim.id}
                      className="flex items-center space-x-2 p-2 border rounded"
                    >
                      <Checkbox
                        id={`dimension-${dim.id}`}
                        checked={selectedDimensions.some(
                          (d) => d.id === dim.id,
                        )}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDimensions((prev) => [...prev, dim]);
                          } else {
                            setSelectedDimensions((prev) =>
                              prev.filter((d) => d.id !== dim.id),
                            );
                          }
                        }}
                      />
                      <Label htmlFor={`dimension-${dim.id}`} className="flex-1">
                        {dim.name}
                      </Label>
                      <Badge variant="secondary">{dim.id}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="measures" className="flex-1 overflow-y-auto">
              <div className="space-y-4 p-4">
                <h3 className="text-lg font-semibold">Measure Configuration</h3>
                <p className="text-sm text-slate-600">
                  Select and reorder measures for your export
                </p>

                <div className="space-y-2">
                  {measures.map((measure) => (
                    <div
                      key={measure.id}
                      className="flex items-center space-x-2 p-2 border rounded"
                    >
                      <Checkbox
                        id={`measure-${measure.id}`}
                        checked={selectedMeasures.some(
                          (m) => m.id === measure.id,
                        )}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedMeasures((prev) => [...prev, measure]);
                          } else {
                            setSelectedMeasures((prev) =>
                              prev.filter((m) => m.id !== measure.id),
                            );
                          }
                        }}
                      />
                      <Label
                        htmlFor={`measure-${measure.id}`}
                        className="flex-1"
                      >
                        {measure.name}
                      </Label>
                      <Badge variant="secondary">{measure.id}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="raw-data" className="flex-1 overflow-y-auto">
              <div className="space-y-4 p-4">
                <h3 className="text-lg font-semibold">
                  Raw Data Configuration
                </h3>
                <p className="text-sm text-slate-600">
                  Configure how raw data is displayed
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      Raw Data Dimension
                    </label>
                    <select
                      className="w-full mt-1 p-2 border rounded"
                      value={rawDataDimension?.id || ""}
                      onChange={(e) => {
                        const selectedDim = dimensions.find(
                          (d) => d.id === e.target.value,
                        );
                        setRawDataDimension(selectedDim || null);
                      }}
                    >
                      <option value="">Select dimension for raw data</option>
                      {dimensions.map((dim) => (
                        <option key={dim.id} value={dim.id}>
                          {dim.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 lg:w-1/2 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-4 flex-shrink-0">
            <Eye className="h-4 w-4" />
            <h3 className="text-lg font-semibold">Preview</h3>
          </div>

          <div className="flex-1 min-h-0">
            {previewCubeState ? (
              <div className="h-full border rounded overflow-hidden">
                <CubeProvider
                  value={{
                    state: previewCubeState,
                    reportId: "export-builder-preview",
                  }}
                >
                  <StoryLayoutWrapper
                    title="Export Preview"
                    description="Preview of your configured cube export"
                    cubeState={previewCubeState}
                    reportId="export-builder-preview"
                  >
                    <CubeView state={previewCubeState} />
                  </StoryLayoutWrapper>
                </CubeProvider>
              </div>
            ) : (
              <div className="h-full border rounded flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <p>Configure dimensions and measures to see preview</p>
                  <p className="text-sm mt-2">
                    Select at least one dimension and measure
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component that handles loading states
export function ExportBuilderPage(props: ExportBuilderPageProps) {
  const navigate = useNavigate();

  // Get the report data
  const generatedReport =
    props.services.generatedReportSourceService.useGeneratedReportSource(
      maybe.of(props.reportId),
    );

  const handleNavigateBack = () => {
    navigate(-1);
  };

  return rd
    .journey(generatedReport)
    .wait(
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNavigateBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
          </div>

          <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
            {/* Configuration Panel Skeleton */}
            <div className="flex-1 lg:w-1/2 lg:max-w-lg space-y-6">
              <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
              <div className="space-y-4">
                <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-10 bg-slate-200 rounded animate-pulse"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Preview Panel Skeleton */}
            <div className="flex-1 lg:w-1/2 flex flex-col">
              <div className="h-8 w-24 bg-slate-200 rounded animate-pulse mb-4 flex-shrink-0" />
              <div className="flex-1 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>,
    )
    .catch((error: unknown) => (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Error Loading Report
          </h2>
          <p className="text-slate-600 mb-4">
            {error instanceof Error
              ? error.message
              : "An unknown error occurred"}
          </p>
          <Button onClick={handleNavigateBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    ))
    .map((report: GeneratedReportSource) => (
      <ExportBuilderContent
        report={report}
        services={props.services}
        onNavigateBack={handleNavigateBack}
      />
    ));
}
