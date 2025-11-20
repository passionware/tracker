/**
 * Export Builder Page
 *
 * Dedicated page for configuring cube exports with:
 * - Dimension editing (exclude, reorder)
 * - Measure editing (exclude, reorder)
 * - Raw data configuration
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
import { CheckboxWithLabel } from "@/components/ui/checkbox.tsx";
import { SortableList, type SortableItem } from "@/components/ui/SortableList";
import { Download, Eye, ArrowLeft, Code, ExternalLink } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import type { SerializableMeasure } from "@/features/_common/Cube/serialization/CubeSerialization.types.ts";
import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import { CubeProvider } from "@/features/_common/Cube/CubeContext.tsx";
import { useCubeState } from "@/features/_common/Cube/useCubeState.ts";
import { StoryLayoutWrapper } from "@/features/_common/Cube/StoryLayoutWrapper.tsx";
import { useReportCube } from "./useReportCube";
import {
  transformAndAnonymize,
  anonymizeByUsage,
} from "./reportCubeTransformation";
import { JsonTreeViewer } from "@/features/_common/JsonTreeViewer";
import type { WithFrontServices } from "@/core/frontServices.ts";
import { maybe, rd } from "@passionware/monads";
import { PublishToCockpitButton } from "./PublishToCockpitButton";
import type { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import type {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { Skeleton } from "@/components/ui/skeleton";
import { SerializedCubeViewWithSelection } from "@/features/_common/Cube/SerializedCubeViewWithSelection";
import { deserializeCubeConfig } from "@/features/_common/Cube/serialization/CubeSerialization.ts";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { ensureError } from "@passionware/platform-js";

// Form schema for export builder
interface ExportBuilderFormData {
  anonymization: {
    anonymizeTimeEntries: boolean;
  };
  selectedDimensions: string[];
  selectedMeasures: string[];
  selectedColumns: string[];
}

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
  projectId,
  projectIterationId,
  workspaceId,
  clientId,
}: {
  report: GeneratedReportSource;
  services: WithFrontServices["services"];
  onNavigateBack: () => void;
  projectId: number;
  projectIterationId: ProjectIteration["id"];
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
}) {
  // Fetch the actual project to get its real client_id
  const projectState = services.projectService.useProject(projectId);
  const iterationState =
    services.projectIterationService.useProjectIterationDetail(
      projectIterationId,
    );

  // Use the shared cube hook to get all cube data
  const { serializableConfig, data } = useReportCube({
    report,
    services,
  });

  // Get dimensions and measures from the serializable config
  const { dimensions, measures } = serializableConfig;

  // Create runtime descriptors when needed for cube state
  const runtimeDescriptors = useMemo(() => {
    const cubeConfig = deserializeCubeConfig(serializableConfig, data as any[]);
    return {
      dimensions: cubeConfig.dimensions,
      measures: cubeConfig.measures,
    };
  }, [serializableConfig, data]);

  // Extract currency from report data (ensure all billing rates use the same currency)
  const currency = useMemo(() => {
    const currencies = new Set<string>();

    // Collect all billing currencies from all role types
    for (const roleType of Object.values(report.data.definitions.roleTypes)) {
      for (const rate of roleType.rates) {
        if (rate.billingCurrency) currencies.add(rate.billingCurrency);
      }
    }

    // If no currencies found, default to EUR
    if (currencies.size === 0) {
      return "EUR";
    }

    // If multiple currencies found, throw an error
    if (currencies.size > 1) {
      const currencyList = Array.from(currencies).join(", ");
      throw new Error(
        `Mixed billing currencies detected in report: ${currencyList}. ` +
          `All billing rates must use the same currency for proper formatting. ` +
          `Please ensure all billing rates in environment variables use the same currency (e.g., "75 EUR", "100 EUR").`,
      );
    }

    // Return the single currency
    return Array.from(currencies)[0];
  }, [report.data.definitions.roleTypes]);

  // Create raw data dimensions manually
  const rawDataDimension = {
    id: "date",
    name: "Date",
    icon: "📅",
    getValue: (item: any) => item.startAt || "Services",
    getKey: (value: any) => String(value ?? "null"),
    formatValue: (value: any) => String(value ?? "Unknown"),
  };

  // Initialize form with default values
  const form = useForm<ExportBuilderFormData>({
    defaultValues: {
      anonymization: {
        anonymizeTimeEntries: false,
      },
      selectedDimensions:
        dimensions.length > 0
          ? ["contractor", "task", "activity", "role"].filter((id) =>
              dimensions.some((dim) => dim.id === id),
            )
          : [],
      selectedMeasures:
        measures.length > 0
          ? ["hours", "billing"].filter((id) =>
              measures.some((measure) => measure.id === id),
            )
          : [],
      selectedColumns: [
        "id",
        "taskId",
        "activityId",
        "contractorId",
        "startAt",
        "endAt",
        "numHours",
        "billingValue",
      ],
    },
  });

  const { control, watch } = form;

  // Preview mode state
  const [previewMode, setPreviewMode] = useState<"cube" | "json">("cube");

  // Watch form values
  const watchedValues = watch();
  const { anonymizeTimeEntries } = watchedValues.anonymization;

  // Determine which dimensions should be disabled based on anonymization settings
  const isDimensionDisabled = (dimId: string) => {
    // If anonymizing time entries, disable date dimension
    if (anonymizeTimeEntries && dimId === "date") {
      return true;
    }
    return false;
  };

  // Filter available dimensions for selection (exclude disabled ones)
  const availableDimensions = dimensions.filter(
    (dim) => !isDimensionDisabled(dim.id),
  );

  // Maintain order from form state for dimensions and measures
  const selectedDimensions = watchedValues.selectedDimensions
    .map((dimId) =>
      runtimeDescriptors.dimensions.find((dim) => dim.id === dimId),
    )
    .filter(Boolean) as typeof runtimeDescriptors.dimensions;

  const selectedMeasures = watchedValues.selectedMeasures
    .map((measureId) =>
      runtimeDescriptors.measures.find((measure) => measure.id === measureId),
    )
    .filter(Boolean) as typeof runtimeDescriptors.measures;

  // Auto-update selected dimensions if they become unavailable due to anonymization
  const currentSelectedDimensions = watchedValues.selectedDimensions;
  const availableSelectedDimensions = currentSelectedDimensions.filter(
    (dimId) => availableDimensions.some((dim) => dim.id === dimId),
  );

  // If some selected dimensions became unavailable, update the form
  if (availableSelectedDimensions.length !== currentSelectedDimensions.length) {
    form.setValue("selectedDimensions", availableSelectedDimensions);
  }

  // Auto-update selected columns based on anonymization settings
  const currentSelectedColumns = watchedValues.selectedColumns;
  let updatedColumns = [...currentSelectedColumns];

  // Remove columns that become unavailable due to anonymization
  if (anonymizeTimeEntries) {
    updatedColumns = updatedColumns.filter(
      (col) => col !== "startAt" && col !== "endAt",
    );
  }

  // Update form if columns changed
  if (updatedColumns.length !== currentSelectedColumns.length) {
    form.setValue("selectedColumns", updatedColumns);
  }

  // Fetch contractor data for labelMapping
  const contractors = rd.mapOrElse(
    services.contractorService.useContractors(
      contractorQueryUtils.getBuilder().build((q) => [
        q.withFilter("id", {
          operator: "oneOf",
          value: Array.from(
            new Set(
              data
                .map((entry) => entry.contractorId)
                .filter((id): id is number => id !== undefined),
            ),
          ),
        }),
      ]),
    ),
    (data) => data,
    [],
  );

  // Apply mandatory preparation and optional anonymization to data with active measures
  const processedData = useMemo(() => {
    let transformedData = transformAndAnonymize(report, {
      anonymizeTimeEntries,
      activeMeasures: watchedValues.selectedMeasures,
    });

    // Apply comprehensive anonymization based on actual usage
    const listViewColumns = [
      {
        id: "id",
        fieldName: "id",
      },
      {
        id: "note",
        fieldName: "note",
      },
      {
        id: "projectId",
        fieldName: "projectId",
      },
      {
        id: "taskId",
        fieldName: "taskId",
      },
      {
        id: "roleId",
        fieldName: "roleId",
      },
      {
        id: "contractorId",
        fieldName: "contractorId",
      },
      {
        id: "activityId",
        fieldName: "activityId",
      },
      {
        id: "startAt",
        fieldName: "startAt",
      },
      {
        id: "endAt",
        fieldName: "endAt",
      },
      {
        id: "numHours",
        fieldName: "numHours",
      },
      {
        id: "costValue",
        fieldName: "costValue",
      },
      {
        id: "billingValue",
        fieldName: "billingValue",
      },
      {
        id: "profitValue",
        fieldName: "profitValue",
      },
    ].filter((column) => watchedValues.selectedColumns.includes(column.id));

    const anonymizationDimensions =
      selectedDimensions.length > 0
        ? selectedDimensions
        : runtimeDescriptors.dimensions;
    const anonymizationMeasures =
      selectedMeasures.length > 0
        ? selectedMeasures
        : runtimeDescriptors.measures;

    transformedData = anonymizeByUsage(transformedData, {
      dimensions: anonymizationDimensions,
      measures: anonymizationMeasures,
      listViewColumns,
    });

    return transformedData;
  }, [
    data,
    anonymizeTimeEntries,
    report,
    watchedValues.selectedMeasures,
    runtimeDescriptors.dimensions,
    runtimeDescriptors.measures,
    selectedDimensions,
    selectedMeasures,
    watchedValues.selectedColumns,
  ]);

  // Generate preview cube state based on processed and filtered configuration
  const previewCubeState = useCubeState({
    data: processedData,
    dimensions:
      selectedDimensions.length > 0
        ? selectedDimensions
        : runtimeDescriptors.dimensions,
    measures:
      selectedMeasures.length > 0
        ? selectedMeasures
        : runtimeDescriptors.measures,
    activeMeasures: watchedValues.selectedMeasures,
    includeItems: true,
    rawDataDimension,
  });

  // Generate serializable config with labelMapping for export
  const exportSerializableConfig = useMemo(() => {
    if (!previewCubeState) return null;
    if (!serializableConfig) return null;

    // Start with the base serializable config
    const config = {
      ...serializableConfig,
      dimensions: selectedDimensions
        .map((dim) => {
          const baseDim = serializableConfig.dimensions.find(
            (d) => d.id === dim.id,
          );
          return baseDim;
        })
        .filter((d) => d !== undefined),
      measures: selectedMeasures
        .map((measure) => {
          return serializableConfig.measures.find((m) => m.id === measure.id);
        })
        .filter((m): m is SerializableMeasure => m !== undefined),
      activeMeasures: watchedValues.selectedMeasures,
      listView: {
        columns: [
          {
            id: "id",
            name: "ID",
            fieldName: "id",
            type: "text" as const,
            description: "Entry identifier",
            sortable: true,
            visible: true,
            width: "100px",
          },
          {
            id: "note",
            name: "Note",
            fieldName: "note",
            type: "text" as const,
            description: "Time entry note",
            sortable: true,
            visible: true,
            width: "200px",
          },
          {
            id: "projectId",
            name: "Project",
            fieldName: "projectId",
            type: "text" as const,
            description: "Project name",
            sortable: true,
            visible: true,
            width: "150px",
          },
          {
            id: "taskId",
            name: "Task",
            fieldName: "taskId",
            type: "text" as const,
            description: "Task name",
            sortable: true,
            visible: true,
            width: "150px",
          },
          {
            id: "roleId",
            name: "Role",
            fieldName: "roleId",
            type: "text" as const,
            description: "Role name",
            sortable: true,
            visible: true,
            width: "120px",
          },
          {
            id: "contractorId",
            name: "Contractor",
            fieldName: "contractorId",
            type: "text" as const,
            description: "Contractor name",
            sortable: true,
            visible: true,
            width: "150px",
          },
          {
            id: "activityId",
            name: "Activity",
            fieldName: "activityId",
            type: "text" as const,
            description: "Activity name",
            sortable: true,
            visible: true,
            width: "120px",
          },
          // Only include measurement columns for selected measures
          ...(watchedValues.selectedMeasures.includes("hours")
            ? [
                {
                  id: "numHours",
                  name: "Hours",
                  fieldName: "numHours",
                  type: "number" as const,
                  description: "Number of hours",
                  sortable: true,
                  visible: true,
                  width: "80px",
                  formatFunction: {
                    type: "number" as const,
                    parameters: { decimals: 2 },
                  },
                },
              ]
            : []),
          ...(watchedValues.selectedMeasures.includes("cost")
            ? [
                {
                  id: "costValue",
                  name: "Cost",
                  fieldName: "costValue",
                  type: "currency" as const,
                  description: "Cost value",
                  sortable: true,
                  visible: true,
                  width: "100px",
                  formatFunction: {
                    type: "currency" as const,
                    parameters: { currency, decimals: 2 },
                  },
                },
              ]
            : []),
          ...(watchedValues.selectedMeasures.includes("billing")
            ? [
                {
                  id: "billingValue",
                  name: "Billing",
                  fieldName: "billingValue",
                  type: "currency" as const,
                  description: "Billing value",
                  sortable: true,
                  visible: true,
                  width: "100px",
                  formatFunction: {
                    type: "currency" as const,
                    parameters: { currency, decimals: 2 },
                  },
                },
              ]
            : []),
          ...(watchedValues.selectedMeasures.includes("profit")
            ? [
                {
                  id: "profitValue",
                  name: "Profit",
                  fieldName: "profitValue",
                  type: "currency" as const,
                  description: "Profit value",
                  sortable: true,
                  visible: true,
                  width: "100px",
                  formatFunction: {
                    type: "currency" as const,
                    parameters: { currency, decimals: 2 },
                  },
                },
              ]
            : []),
          {
            id: "startAt",
            name: "Start Time",
            fieldName: "startAt",
            type: "date" as const,
            description: "Start time",
            sortable: true,
            visible: true,
            width: "150px",
          },
          {
            id: "endAt",
            name: "End Time",
            fieldName: "endAt",
            type: "date" as const,
            description: "End time",
            sortable: true,
            visible: true,
            width: "150px",
          },
        ]
          .filter((column) => watchedValues.selectedColumns.includes(column.id))
          .sort((a, b) => {
            const indexA = watchedValues.selectedColumns.indexOf(a.id);
            const indexB = watchedValues.selectedColumns.indexOf(b.id);
            return indexA - indexB;
          }),
        maxInitialItems: 50,
        enablePagination: true,
        itemsPerPage: 25,
        enableSearch: true,
      },
    };

    // Return the SerializableCubeState directly (no need to serialize again!)
    return {
      config,
      data: processedData,
    };
  }, [
    serializableConfig,
    selectedDimensions,
    selectedMeasures,
    report.data.definitions,
    contractors,
    watchedValues.selectedMeasures,
    watchedValues.selectedColumns,
    processedData,
  ]);

  const handleExport = useCallback(() => {
    if (!exportSerializableConfig) return;

    const jsonString = JSON.stringify(exportSerializableConfig, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `cube-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [exportSerializableConfig]);

  const handleOpenInPublic = useCallback(() => {
    window.open("/p/explorer", "_blank");
  }, []);

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
              <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                Export Builder
                {rd
                  .journey(iterationState)
                  .wait(<Skeleton className="h-4 w-32 rounded" />)
                  .catch(() => null)
                  .map((iteration) => (
                    <span className="text-xs font-normal text-slate-500">
                      {services.formatService.temporal.range.long(
                        iteration.periodStart,
                        iteration.periodEnd,
                      )}
                    </span>
                  ))}
              </h1>
              <p className="text-sm text-slate-600">
                Configure and export your cube data
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleOpenInPublic}
              disabled={!exportSerializableConfig}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Public Explorer
            </Button>
            {rd
              .journey(projectState)
              .wait(<Skeleton className="h-10 w-32" />)
              .catch((e) => (
                <SimpleTooltip title={ensureError(e).message}>
                  <Button variant="outline" visuallyDisabled>
                    Project Error
                  </Button>
                </SimpleTooltip>
              ))
              .map((project) => (
                <PublishToCockpitButton
                  services={services}
                  serializableConfig={exportSerializableConfig}
                  report={report}
                  projectId={projectId}
                  clientId={project.clientId}
                  workspaceSpec={workspaceId}
                  clientSpec={clientId}
                  sourceWorkspaceId={project.workspaceIds?.[0] ?? null}
                  sourceClientId={project.clientId}
                />
              ))}
            <Button
              onClick={handleExport}
              disabled={!exportSerializableConfig}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 min-h-0">
        {/* Configuration Panel */}
        <div className="flex-1 lg:w-1/2 lg:max-w-lg">
          <Tabs defaultValue="anonymization" className="h-full flex flex-col">
            <TabsList className="flex-shrink-0">
              <TabsTrigger value="anonymization">Anonymize</TabsTrigger>
              <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
              <TabsTrigger value="measures">Measures</TabsTrigger>
              <TabsTrigger value="raw-data">Columns</TabsTrigger>
            </TabsList>

            <TabsContent
              value="anonymization"
              className="flex-1 overflow-y-auto"
            >
              <div className="space-y-4 p-4">
                <h3 className="text-lg font-semibold">Data Anonymization</h3>
                <p className="text-sm text-slate-600">
                  Anonymize sensitive data before export
                </p>

                <div className="space-y-4">
                  <Controller
                    name="anonymization.anonymizeTimeEntries"
                    control={control}
                    render={({ field }) => (
                      <CheckboxWithLabel
                        id="anonymize-time-entries"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        title="Anonymize time entries"
                        description="Group identical entries and replace start/end times with total hours"
                      />
                    )}
                  />
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

                <Controller
                  name="selectedDimensions"
                  control={control}
                  render={({ field }) => {
                    const dimensionItems: SortableItem[] = dimensions.map(
                      (dim) => ({
                        id: dim.id,
                        name: dim.name,
                        icon: dim.icon,
                        badge: dim.id,
                        description: isDimensionDisabled(dim.id)
                          ? "Cannot be used with time entry optimization"
                          : `Include ${dim.name} in export`,
                        disabled: isDimensionDisabled(dim.id),
                      }),
                    );

                    return (
                      <SortableList
                        items={dimensionItems}
                        selectedItems={field.value}
                        onSelectionChange={field.onChange}
                        onReorder={field.onChange}
                        showReorderHandle={true}
                        showRemoveButton={true}
                      />
                    );
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="measures" className="flex-1 overflow-y-auto">
              <div className="space-y-4 p-4">
                <h3 className="text-lg font-semibold">Measure Configuration</h3>
                <p className="text-sm text-slate-600">
                  Select and reorder measures for your export
                </p>

                <Controller
                  name="selectedMeasures"
                  control={control}
                  render={({ field }) => {
                    const measureItems: SortableItem[] = measures.map(
                      (measure) => ({
                        id: measure.id,
                        name: measure.name,
                        icon: measure.icon,
                        badge: measure.id,
                        description: `Include ${measure.name} in export`,
                      }),
                    );

                    return (
                      <SortableList
                        items={measureItems}
                        selectedItems={field.value}
                        onSelectionChange={field.onChange}
                        onReorder={field.onChange}
                        showReorderHandle={true}
                        showRemoveButton={true}
                      />
                    );
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="raw-data" className="flex-1 overflow-y-auto">
              <div className="space-y-4 p-4">
                <h3 className="text-lg font-semibold">Column Configuration</h3>
                <p className="text-sm text-slate-600">
                  Configure which columns to include in the exported data
                </p>

                <Controller
                  name="selectedColumns"
                  control={control}
                  render={({ field }) => {
                    const columnItems: SortableItem[] = [
                      {
                        id: "id",
                        name: "ID",
                        description: "Entry identifier",
                      },
                      {
                        id: "note",
                        name: "Note",
                        description: "Entry description",
                      },
                      {
                        id: "taskId",
                        name: "Task",
                        description: "Task type",
                      },
                      {
                        id: "activityId",
                        name: "Activity",
                        description: "Activity type",
                      },
                      {
                        id: "projectId",
                        name: "Project",
                        description: "Project name",
                      },
                      {
                        id: "roleId",
                        name: "Role",
                        description: "Role type",
                        disabled: false,
                      },
                      {
                        id: "contractorId",
                        name: "Contractor",
                        description: "Contractor ID",
                        disabled: false,
                      },
                      {
                        id: "startAt",
                        name: "Start Time",
                        description: "Entry start time",
                        disabled: anonymizeTimeEntries,
                      },
                      {
                        id: "endAt",
                        name: "End Time",
                        description: "Entry end time",
                        disabled: anonymizeTimeEntries,
                      },
                      {
                        id: "numHours",
                        name: "Hours",
                        description: "Total hours worked",
                      },
                      {
                        id: "costValue",
                        name: "Cost",
                        description: "Cost value",
                      },
                      {
                        id: "billingValue",
                        name: "Billing",
                        description: "Billing value",
                      },
                      {
                        id: "profitValue",
                        name: "Profit",
                        description: "Profit value",
                      },
                    ].map((column) => ({
                      ...column,
                      description: column.disabled
                        ? `Cannot be used with ${
                            column.id === "contractorId" ||
                            column.id === "roleId"
                              ? "contractor anonymization"
                              : "time entry optimization"
                          }`
                        : column.description,
                    }));

                    return (
                      <SortableList
                        items={columnItems}
                        selectedItems={field.value}
                        onSelectionChange={field.onChange}
                        onReorder={field.onChange}
                        showReorderHandle={true}
                        showRemoveButton={true}
                      />
                    );
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 lg:w-1/2 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Preview</h3>
            </div>
            <div className="flex gap-2">
              <Button
                variant={previewMode === "cube" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode("cube")}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Cube View
              </Button>
              <Button
                variant={previewMode === "json" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode("json")}
                className="flex items-center gap-2"
              >
                <Code className="h-4 w-4" />
                JSON View
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            {previewCubeState ? (
              <div className="h-full border rounded overflow-hidden">
                {previewMode === "cube" ? (
                  <CubeProvider
                    value={{
                      state: previewCubeState,
                      reportId: "export-builder-preview",
                    }}
                  >
                    <StoryLayoutWrapper
                      title="Export Preview"
                      description="Preview of your configured cube export"
                    >
                      {exportSerializableConfig && (
                        <SerializedCubeViewWithSelection
                          className="p-4 flex-1 min-h-0"
                          state={previewCubeState}
                          serializedConfig={exportSerializableConfig.config}
                          maxInitialDepth={0}
                          enableZoomIn={true}
                        />
                      )}
                    </StoryLayoutWrapper>
                  </CubeProvider>
                ) : (
                  <div className="h-full p-4">
                    <JsonTreeViewer
                      data={exportSerializableConfig || {}}
                      title="Cube Configuration"
                      className="h-full"
                      initiallyExpanded={true}
                    />
                  </div>
                )}
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
      <div className="w-full h-full bg-slate-50">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-8 w-20" />
            <div className="h-8 w-full bg-slate-200 rounded animate-pulse" />
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
        projectId={props.projectId}
        projectIterationId={props.projectIterationId}
        workspaceId={props.workspaceId}
        clientId={props.clientId}
      />
    ));
}
