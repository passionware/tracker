import type { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api";
import {
  CubeLayout,
  CubeProvider,
  CubeBreakdownControl,
  CubeTimeSubrangeControl,
  CubeHierarchicalBreakdown,
  CubeDimensionExplorer,
  CubeSummary,
} from "@/features/_common/Cube";
import { SerializedCubeViewWithSelection } from "@/features/_common/Cube/SerializedCubeViewWithSelection";
import { CubeTimelineView } from "@/features/_common/Cube/CubeTimelineView";
import { useReportCube } from "@/features/project-iterations/widgets/useReportCube";
import { WithFrontServices } from "@/core/frontServices";

export function TmetricCubeExplorer({
  report,
  services,
  className,
}: {
  report: GeneratedReportSource;
  services: WithFrontServices["services"];
  className?: string;
}) {
  const { cubeState, serializableConfig } = useReportCube({ report, services });

  return (
    <CubeProvider value={{ state: cubeState, reportId: "tmetric-dashboard" }}>
      <CubeLayout
        className={
          className ??
          "w-full h-full min-h-0 rounded-md border border-border overflow-hidden"
        }
        leftSidebar={
          <>
            <div className="p-4 space-y-4 flex-1">
              <CubeSummary />
              <CubeTimeSubrangeControl services={services} />
              <CubeBreakdownControl />
            </div>
            <div className="p-4 pt-0">
              <CubeHierarchicalBreakdown />
            </div>
          </>
        }
        rightSidebar={<CubeDimensionExplorer />}
        bottomSlot={<CubeTimelineView />}
      >
        <div className="bg-background w-full h-full flex-1 min-h-0 p-4 flex flex-col">
          <SerializedCubeViewWithSelection
            state={cubeState}
            serializedConfig={serializableConfig}
            maxInitialDepth={0}
            enableZoomIn={true}
          />
        </div>
      </CubeLayout>
    </CubeProvider>
  );
}
