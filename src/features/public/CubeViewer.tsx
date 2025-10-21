import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CubeProvider,
  CubeLayout,
  CubeSummary,
  CubeBreakdownControl,
  CubeHierarchicalBreakdown,
  CubeDimensionExplorer,
} from "@/features/_common/Cube";
import { SerializedCubeView } from "@/features/_common/Cube/SerializedCubeView";
import { useCubeState } from "@/features/_common/Cube/useCubeState";
import { deserializeCubeConfig } from "@/features/_common/Cube/serialization/CubeSerialization";
import { JsonTreeViewer } from "@/features/_common/JsonTreeViewer";
import { Grid3X3, Code, ArrowLeft } from "lucide-react";

interface CubeViewerProps {
  serializedConfig: any;
  title?: string;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function CubeViewer({
  serializedConfig,
  title = "Cube Viewer",
  onBack,
  showBackButton = true,
}: CubeViewerProps) {
  const [viewMode, setViewMode] = useState<"cube" | "json">("cube");

  // Check if this looks like a serialized cube configuration
  const isSerializedCube =
    serializedConfig &&
    typeof serializedConfig === "object" &&
    "config" in serializedConfig &&
    "data" in serializedConfig;

  if (!isSerializedCube) {
    return (
      <div className="h-full flex flex-col bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            {showBackButton && onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
              <p className="text-sm text-slate-600">
                This doesn't appear to be a serialized cube configuration
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>JSON Data View</CardTitle>
              <CardDescription>
                This data is not a cube configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JsonTreeViewer
                data={serializedConfig}
                title="Serialized Configuration"
                className="h-96"
                initiallyExpanded={true}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Deserialize the cube configuration properly
  const cubeConfig = useMemo(() => {
    return deserializeCubeConfig(
      serializedConfig.config,
      serializedConfig.data,
    );
  }, [serializedConfig.config, serializedConfig.data]);

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
      getValue: (item: any) => item.id || item,
    },
  });

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showBackButton && onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
              <p className="text-sm text-slate-600">
                Interactive cube visualization
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "cube" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("cube")}
              className="flex items-center gap-2"
            >
              <Grid3X3 className="h-4 w-4" />
              Cube View
            </Button>
            <Button
              variant={viewMode === "json" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("json")}
              className="flex items-center gap-2"
            >
              <Code className="h-4 w-4" />
              JSON View
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === "cube" ? (
          <CubeProvider value={{ state: cubeState, reportId: "cube-viewer" }}>
            <CubeLayout
              className="w-full h-full"
              leftSidebar={
                <>
                  <div className="p-4 space-y-4 flex-1">
                    <CubeSummary />
                    <CubeBreakdownControl />
                  </div>
                  <div className="p-4 pt-0">
                    <CubeHierarchicalBreakdown />
                  </div>
                </>
              }
              rightSidebar={<CubeDimensionExplorer />}
            >
              <div className="bg-white w-full h-full flex-1 min-h-0 p-4 flex flex-col">
                <SerializedCubeView
                  state={cubeState}
                  serializedConfig={serializedConfig.config}
                  maxInitialDepth={0}
                  enableZoomIn={true}
                />
              </div>
            </CubeLayout>
          </CubeProvider>
        ) : (
          <div className="h-full p-6">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Raw JSON Configuration</CardTitle>
                <CardDescription>
                  Complete serialized cube configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="h-full min-h-0 ">
                <JsonTreeViewer
                  data={serializedConfig}
                  title="Serialized Cube Configuration"
                  className="h-full"
                  initiallyExpanded={true}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
