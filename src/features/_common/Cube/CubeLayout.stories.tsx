/**
 * Storybook examples for Cube Layout components
 */

import {
  CubeLayout,
  CubeDimensionExplorer,
  CubeSummary,
  CubeBreakdownControl,
  CubeTimeSubrangeControl,
  CubeHierarchicalBreakdown,
  CubeProvider,
  useCubeState,
} from "@/features/_common/Cube/index.ts";
import { createFormatService } from "@/services/FormatService/FormatService.impl.tsx";
import type { Meta, StoryObj } from "@storybook/react";

// Mock report data for stories
const mockReport = {
  id: 1,
  createdAt: new Date("2024-01-15T10:00:00Z"),
  projectIterationId: 1,
  data: {
    definitions: {
      taskTypes: {},
      activityTypes: {},
      projectTypes: {},
      roleTypes: {},
    },
    timeEntries: [
      {
        id: "1",
        note: "React Components",
        taskId: "task-1",
        activityId: "activity-1",
        projectId: "project-1",
        roleId: "role-1",
        contractorId: 1,
        createdAt: new Date("2024-01-15T09:00:00Z"),
        updatedAt: new Date("2024-01-15T17:00:00Z"),
        startAt: new Date("2024-01-15T09:00:00Z"),
        endAt: new Date("2024-01-15T17:00:00Z"),
      },
      {
        id: "2",
        note: "API Development",
        taskId: "task-2",
        activityId: "activity-2",
        projectId: "project-1",
        roleId: "role-2",
        contractorId: 2,
        createdAt: new Date("2024-01-15T09:00:00Z"),
        updatedAt: new Date("2024-01-15T15:00:00Z"),
        startAt: new Date("2024-01-15T09:00:00Z"),
        endAt: new Date("2024-01-15T15:00:00Z"),
      },
    ],
  },
  originalData: [],
};

// Wrapper component to provide Cube context
function CubeStoryWrapper({ children }: { children: React.ReactNode }) {
  // Create mock dimensions and measures for the stories
  const dimensions = [
    {
      id: "contractor",
      name: "Contractor",
      icon: "👤",
      getKey: (item: any) => item.contractorId,
      getLabel: (item: any) => `Contractor ${item.contractorId}`,
      getValue: (item: any) => item.contractorId,
    },
    {
      id: "project",
      name: "Project",
      icon: "📁",
      getKey: (item: any) => item.projectId,
      getLabel: (item: any) => `Project ${item.projectId}`,
      getValue: (item: any) => item.projectId,
    },
  ];

  const measures = [
    {
      id: "hours",
      name: "Hours",
      icon: "⏱️",
      getValue: (_item: any) => 8, // Mock hours
      aggregate: (values: unknown[]) =>
        values.reduce(
          (sum: number, v) => sum + (typeof v === "number" ? v : 0),
          0,
        ),
      formatValue: (value: unknown) =>
        `${typeof value === "number" ? value : 0}h`,
    },
    {
      id: "cost",
      name: "Cost",
      icon: "💰",
      getValue: (_item: any) => 400, // Mock cost
      aggregate: (values: unknown[]) =>
        values.reduce(
          (sum: number, v) => sum + (typeof v === "number" ? v : 0),
          0,
        ),
      formatValue: (value: unknown) =>
        `$${typeof value === "number" ? value : 0}`,
    },
  ];

  const cubeState = useCubeState({
    data: mockReport.data.timeEntries,
    dimensions,
    measures,
    rawDataDimension: {
      id: "date",
      name: "Date",
      icon: "📅",
      getValue: (item) => item.startAt || item.createdAt,
      formatValue: (value) => {
        const d = new Date(value as string | number | Date);
        return d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      },
    },
  });

  const contextValue = {
    state: cubeState,
    reportId: String(mockReport.id),
  };

  return <CubeProvider value={contextValue}>{children}</CubeProvider>;
}

// Meta configuration
const meta: Meta = {
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj;

// Basic Layout Story
export const BasicLayout: Story = {
  render: () => (
    <div className="h-screen">
      <CubeStoryWrapper>
        <CubeLayout>
          <div className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Main Content Area</h2>
            <p className="text-gray-600">
              This is where your main cube view or analysis content would go.
            </p>
          </div>
        </CubeLayout>
      </CubeStoryWrapper>
    </div>
  ),
};

// Layout with Custom Left Sidebar
export const CustomLeftSidebar: Story = {
  render: () => (
    <div className="h-screen">
      <CubeStoryWrapper>
        <CubeLayout
          leftSidebar={
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">
                Custom Left Sidebar
              </h3>
              <p className="text-sm text-gray-600">
                You can provide custom content for the left sidebar.
              </p>
            </div>
          }
        >
          <div className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Main Content Area</h2>
            <p className="text-gray-600">
              This is where your main cube view or analysis content would go.
            </p>
          </div>
        </CubeLayout>
      </CubeStoryWrapper>
    </div>
  ),
};

// Layout with Custom Right Sidebar
export const CustomRightSidebar: Story = {
  render: () => (
    <div className="h-screen">
      <CubeStoryWrapper>
        <CubeLayout
          rightSidebar={
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">
                Custom Right Sidebar
              </h3>
              <p className="text-sm text-gray-600">
                You can provide custom content for the right sidebar.
              </p>
            </div>
          }
        >
          <div className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Main Content Area</h2>
            <p className="text-gray-600">
              This is where your main cube view or analysis content would go.
            </p>
          </div>
        </CubeLayout>
      </CubeStoryWrapper>
    </div>
  ),
};

// Layout with Custom Styling
export const CustomStyling: Story = {
  render: () => (
    <div className="h-screen">
      <CubeStoryWrapper>
        <CubeLayout
          className="bg-slate-50"
          rightSidebar={<CubeDimensionExplorer />}
        >
          <div className="p-8 text-center bg-white m-4 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Main Content Area</h2>
            <p className="text-gray-600">
              This is where your main cube view or analysis content would go.
            </p>
          </div>
        </CubeLayout>
      </CubeStoryWrapper>
    </div>
  ),
};

// Full Cube Layout with All Components
export const FullCubeLayout: Story = {
  render: () => {
    const formatService = createFormatService(() => new Date());
    return (
      <div className="h-screen">
        <CubeStoryWrapper>
          <CubeLayout
            leftSidebar={
              <>
                <div className="p-4 space-y-4 flex-1">
                  <CubeSummary />
                  <CubeTimeSubrangeControl services={{ formatService }} />
                  <CubeBreakdownControl />
                </div>
                <div className="p-4 pt-0">
                  <CubeHierarchicalBreakdown />
                </div>
              </>
            }
            rightSidebar={<CubeDimensionExplorer />}
          >
            <div className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">Main Content Area</h2>
              <p className="text-gray-600">
                This is where your main cube view or analysis content would go.
              </p>
            </div>
          </CubeLayout>
        </CubeStoryWrapper>
      </div>
    );
  },
};
