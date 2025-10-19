/**
 * Storybook stories for Cube Serialization
 *
 * Demonstrates how to serialize and deserialize cube configurations
 * for database storage and restoration.
 */

import type { Meta, StoryObj } from "@storybook/react";
import { useMemo } from "react";
import { CubeView } from "../CubeView.tsx";
import { useCubeState } from "../useCubeState.ts";
import {
  CubeProvider,
  useCubeContext,
  useSelectedMeasure,
} from "../CubeContext.tsx";
import { CubeSunburst } from "../CubeSunburst.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import type { CubeDataItem } from "../CubeService.types.ts";
import { deserializeCubeConfig } from "./CubeSerialization.ts";
import { createDimensionWithLabels } from "./CubeSerialization.utils.ts";

const meta: Meta = {
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Cube Serialization Stories - Interactive examples of serializing and deserializing cube configurations for database storage and restoration.",
      },
    },
  },
};

export default meta;

type Story = StoryObj;

// Left Sidebar Component (Summary + Sunburst)
function LeftSidebar() {
  const { state, dimensions, measures } = useCubeContext();
  const { selectedMeasure } = useSelectedMeasure();
  const cube = state.cube;

  // Get current zoom level data
  const currentItems =
    state.path.length === 0 ? cube.filteredData || [] : cube.filteredData || [];

  return (
    <div className="w-80 border-r border-slate-200 bg-white overflow-y-auto flex flex-col">
      {/* Summary Section */}
      <div className="p-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {state.path.length === 0
                ? "Summary (All Data)"
                : "Summary (Current Level)"}
            </CardTitle>
            <div className="text-xs text-slate-500">
              {state.path.length === 0 ? (
                <>{cube.totalItems} items</>
              ) : (
                <>
                  {cube.totalItems} items in{" "}
                  {state.path[state.path.length - 1].dimensionId}
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {measures.map((measure: any) => {
              // Calculate totals from current zoom level data
              const totalValue = currentItems.reduce(
                (sum: number, item: any) => {
                  const value = measure.getValue(item);
                  return sum + (typeof value === "number" ? value : 0);
                },
                0,
              );

              return (
                <div
                  key={measure.id}
                  className="flex justify-between items-center"
                >
                  <div className="flex items-center gap-2">
                    {measure.icon && <span>{measure.icon}</span>}
                    <span className="text-sm font-medium">{measure.name}</span>
                  </div>
                  <div className="text-sm font-bold">
                    {measure.formatValue
                      ? measure.formatValue(totalValue)
                      : String(totalValue)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Sunburst Chart */}
      <div className="flex-1 p-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Hierarchical Breakdown</CardTitle>
            <div className="text-xs text-slate-500">
              {selectedMeasure.name} by dimensions
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <CubeSunburst
                state={state}
                dimensions={dimensions}
                rootData={currentItems}
                measure={selectedMeasure}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Right Sidebar Component (Measure Selector + Dimension Breakdowns)
function RightSidebar() {
  const { state, dimensions, measures, data } = useCubeContext();
  const { selectedMeasureId, setSelectedMeasureId } = useSelectedMeasure();
  const cube = state.cube;

  // Get current zoom level data
  const currentItems = state.path.length === 0 ? data : cube.filteredData || [];

  // Filter out dimensions that are already used in the current path
  const sidebarDimensions = dimensions.filter((dim: any) => {
    const usedDimensions = state.path.map((p: any) => p.dimensionId);
    return !usedDimensions.includes(dim.id);
  });

  return (
    <div className="w-80 border-l border-slate-200 bg-white overflow-y-auto flex flex-col">
      {/* Measure Selector */}
      <div className="p-4 border-b border-slate-200">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Measure</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedMeasureId}
              onValueChange={setSelectedMeasureId}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {measures.map((measure: any) => (
                  <SelectItem key={measure.id} value={measure.id}>
                    <div className="flex items-center gap-2">
                      {measure.icon && <span>{measure.icon}</span>}
                      <span>{measure.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Dimension Breakdowns */}
      <div className="flex-1 p-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Breakdown by</CardTitle>
            <div className="text-xs text-slate-500">
              Click to drill down into dimensions
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {sidebarDimensions.map((dim: any) => {
              // Get unique values for this dimension from current data
              const uniqueValues = Array.from(
                new Set(
                  currentItems.map((item: any) => {
                    const value = dim.getValue(item);
                    return dim.formatValue
                      ? dim.formatValue(value)
                      : String(value);
                  }),
                ),
              ).slice(0, 10); // Limit to 10 items for performance

              return (
                <div key={dim.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    {dim.icon && <span>{dim.icon}</span>}
                    <span className="text-sm font-medium">{dim.name}</span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    {uniqueValues.map((value: any, index: number) => (
                      <div key={index} className="truncate">
                        {value}
                      </div>
                    ))}
                    {uniqueValues.length === 10 && (
                      <div className="text-slate-400">...</div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ListView Renderer Component for Serialized Cubes
function SerializedCubeListView({
  serializedConfig,
  data,
}: {
  serializedConfig: any;
  data: any[];
}) {
  if (!serializedConfig?.listView?.columns) {
    return (
      <div className="p-4 text-center text-slate-500">
        <p>No ListView configuration provided</p>
        <p className="text-sm mt-2">
          Add listView.columns to the serialized config
        </p>
      </div>
    );
  }

  // Convert serialized columns to TanStack Table columns
  const columns: ColumnDef<any>[] = serializedConfig.listView.columns.map(
    (col: any) => ({
      id: col.id,
      header: col.name,
      accessorKey: col.fieldName,
      cell: ({ getValue }: { getValue: () => any }) => {
        const value = getValue();
        if (col.formatFunction) {
          // Apply format function if available
          return String(value);
        }
        return String(value);
      },
      meta: {
        tooltip: col.description,
        sortKey: col.sortable ? col.fieldName : undefined,
      },
    }),
  );

  // Create query for ListView
  const query = {
    sort: [] as any[],
    page: 1,
    limit: serializedConfig.listView.maxInitialItems || 50,
  };

  return (
    <div className="h-full">
      <ListView
        data={{ type: "success", data } as any}
        columns={columns}
        query={query as any}
        onQueryChange={() => {}}
        caption={`Raw data view with ${data.length} items`}
      />
    </div>
  );
}

// Sample time tracking data
const timeTrackingData: CubeDataItem[] = [
  {
    date: "2025-01-01",
    numHours: 8.5,
    projectName: "Project Alpha",
    categoryName: "Development",
    contractorName: "John Doe",
  },
  {
    date: "2025-01-01",
    numHours: 4.0,
    projectName: "Project Beta",
    categoryName: "Testing",
    contractorName: "Jane Smith",
  },
  {
    date: "2025-01-02",
    numHours: 7.0,
    projectName: "Project Alpha",
    categoryName: "Development",
    contractorName: "John Doe",
  },
  {
    date: "2025-01-02",
    numHours: 6.5,
    projectName: "Project Gamma",
    categoryName: "Design",
    contractorName: "Bob Johnson",
  },
  {
    date: "2025-01-03",
    numHours: 8.0,
    projectName: "Project Beta",
    categoryName: "Testing",
    contractorName: "Jane Smith",
  },
  {
    date: "2025-01-03",
    numHours: 5.5,
    projectName: "Project Alpha",
    categoryName: "Development",
    contractorName: "John Doe",
  },
];

/**
 * Story: Time Tracking with Pre-aggregated Data
 *
 * Shows how to work with time tracking data that's already aggregated by day.
 */
export const TimeTrackingPreAggregated: Story = {
  args: {
    serializedConfig: {
      metadata: {
        version: "1.0.0",
        createdAt: "2025-01-15T10:00:00.000Z",
        modifiedAt: "2025-01-15T10:00:00.000Z",
        name: "Daily Time Tracking",
        description: "Time tracking data with daily aggregation",
      },
      dataSchema: {
        fields: [
          {
            name: "date",
            type: "date",
            description: "Date for day aggregation",
            nullable: false,
          },
          {
            name: "numHours",
            type: "number",
            description: "Hours worked",
            nullable: false,
          },
          {
            name: "projectName",
            type: "string",
            description: "Project name",
            nullable: false,
          },
          {
            name: "categoryName",
            type: "string",
            description: "Category name",
            nullable: false,
          },
          {
            name: "contractorName",
            type: "string",
            description: "Contractor name",
            nullable: false,
          },
        ],
      },
      dimensions: [
        {
          id: "date",
          name: "Date",
          fieldName: "date",
          description: "Work date",
        },
        {
          id: "project",
          name: "Project",
          fieldName: "projectName",
          description: "Project name",
        },
        {
          id: "category",
          name: "Category",
          fieldName: "categoryName",
          description: "Category name",
        },
        {
          id: "contractor",
          name: "Contractor",
          fieldName: "contractorName",
          description: "Contractor name",
        },
      ],
      measures: [
        {
          id: "totalHours",
          name: "Total Hours",
          fieldName: "numHours",
          aggregationFunction: "sum",
          description: "Sum of hours worked",
        },
        {
          id: "avgHours",
          name: "Average Hours",
          fieldName: "numHours",
          aggregationFunction: "average",
          description: "Average hours per day",
        },
        {
          id: "entryCount",
          name: "Entry Count",
          fieldName: "date",
          aggregationFunction: "count",
          description: "Number of time entries",
        },
      ],
      breakdownMap: {
        "": "project",
        "project:*": "category",
        "category:*": "contractor",
      },
      listView: {
        columns: [
          {
            id: "date",
            name: "Date",
            fieldName: "date",
            type: "date",
            description: "Work date",
            sortable: true,
            visible: true,
            width: "120px",
          },
          {
            id: "projectName",
            name: "Project",
            fieldName: "projectName",
            type: "text",
            description: "Project name",
            sortable: true,
            visible: true,
            width: "150px",
          },
          {
            id: "categoryName",
            name: "Category",
            fieldName: "categoryName",
            type: "text",
            description: "Category name",
            sortable: true,
            visible: true,
            width: "120px",
          },
          {
            id: "contractorName",
            name: "Contractor",
            fieldName: "contractorName",
            type: "text",
            description: "Contractor name",
            sortable: true,
            visible: true,
            width: "150px",
          },
          {
            id: "numHours",
            name: "Hours",
            fieldName: "numHours",
            type: "number",
            description: "Hours worked",
            sortable: true,
            visible: true,
            width: "80px",
          },
        ],
        maxInitialItems: 20,
        enablePagination: true,
        itemsPerPage: 10,
        enableSearch: true,
      },
    },
  },
  render: (args: any) => {
    const { serializedConfig } = args;

    // Create cube configuration from serialized config
    const cubeConfig = useMemo(() => {
      if (!serializedConfig) return null;
      return deserializeCubeConfig(serializedConfig, timeTrackingData);
    }, [serializedConfig]);

    // Cube state
    const cubeState = useCubeState({
      data: cubeConfig?.data || [],
      dimensions: cubeConfig?.dimensions || [],
      measures: cubeConfig?.measures || [],
      initialFilters: cubeConfig?.filters,
    });

    if (!cubeConfig) {
      return (
        <div className="p-6">
          <div className="text-center text-slate-500">
            <p>No serialized configuration provided</p>
            <p className="text-sm mt-2">
              Use the Controls panel to edit the serialized config
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-screen border rounded-lg overflow-hidden">
        <CubeProvider
          value={{
            state: cubeState,
            dimensions: cubeConfig?.dimensions || [],
            measures: cubeConfig?.measures || [],
            data: cubeConfig?.data || [],
            reportId: "serialization-story",
          }}
        >
          {/* Left Sidebar - Summary + Sunburst */}
          <LeftSidebar />

          {/* Main Content - Cube View */}
          <div className="flex-1 overflow-hidden">
            <CubeView
              state={cubeState}
              enableDimensionPicker={false}
              enableRawDataView={true}
              showGrandTotals={false}
              renderRawData={(items, _group) => (
                <SerializedCubeListView
                  serializedConfig={serializedConfig}
                  data={items}
                />
              )}
            />
          </div>

          {/* Right Sidebar - Measure Selector + Dimension Breakdowns */}
          <RightSidebar />
        </CubeProvider>
      </div>
    );
  },
};

/**
 * Story: Simple Data Schema Example
 *
 * Shows how to create cube configurations for any type of data
 * by simply defining dimensions and measures that work with any field.
 */
export const SimpleDataSchema: Story = {
  args: {
    serializedConfig: {
      metadata: {
        version: "1.0.0",
        createdAt: "2025-01-15T10:00:00.000Z",
        modifiedAt: "2025-01-15T10:00:00.000Z",
        name: "E-commerce Analytics",
        description: "Flexible e-commerce data analysis",
      },
      dataSchema: {
        fields: [
          {
            name: "orderId",
            type: "string",
            description: "Order identifier",
            nullable: false,
          },
          {
            name: "customerId",
            type: "string",
            description: "Customer identifier",
            nullable: false,
          },
          {
            name: "product",
            type: "string",
            description: "Product name",
            nullable: false,
          },
          {
            name: "category",
            type: "string",
            description: "Product category",
            nullable: false,
          },
          {
            name: "region",
            type: "string",
            description: "Sales region",
            nullable: false,
          },
          {
            name: "amount",
            type: "number",
            description: "Order amount",
            nullable: false,
          },
          {
            name: "quantity",
            type: "number",
            description: "Item quantity",
            nullable: false,
          },
          {
            name: "profit",
            type: "number",
            description: "Profit margin",
            nullable: false,
          },
          {
            name: "rating",
            type: "number",
            description: "Product rating",
            nullable: false,
          },
          {
            name: "orderDate",
            type: "date",
            description: "Order date",
            nullable: false,
          },
        ],
      },
      dimensions: [
        {
          id: "product",
          name: "Product",
          fieldName: "product",
          description: "Product name",
        },
        {
          id: "category",
          name: "Category",
          fieldName: "category",
          description: "Product category",
        },
        {
          id: "region",
          name: "Region",
          fieldName: "region",
          description: "Sales region",
        },
        {
          id: "customerId",
          name: "Customer",
          fieldName: "customerId",
          description: "Customer identifier",
        },
      ],
      measures: [
        {
          id: "totalAmount",
          name: "Total Amount",
          fieldName: "amount",
          aggregationFunction: "sum",
          description: "Sum of order amounts",
        },
        {
          id: "totalQuantity",
          name: "Total Quantity",
          fieldName: "quantity",
          aggregationFunction: "sum",
          description: "Sum of quantities",
        },
        {
          id: "totalProfit",
          name: "Total Profit",
          fieldName: "profit",
          aggregationFunction: "sum",
          description: "Sum of profits",
        },
        {
          id: "avgRating",
          name: "Average Rating",
          fieldName: "rating",
          aggregationFunction: "average",
          description: "Average product rating",
        },
      ],
      breakdownMap: {
        "": "product",
        "product:*": "category",
        "category:*": "region",
      },
      listView: {
        columns: [
          {
            id: "orderId",
            name: "Order ID",
            fieldName: "orderId",
            type: "text",
            description: "Order identifier",
            sortable: true,
            visible: true,
            width: "120px",
          },
          {
            id: "product",
            name: "Product",
            fieldName: "product",
            type: "text",
            description: "Product name",
            sortable: true,
            visible: true,
            width: "150px",
          },
          {
            id: "category",
            name: "Category",
            fieldName: "category",
            type: "text",
            description: "Product category",
            sortable: true,
            visible: true,
            width: "120px",
          },
          {
            id: "region",
            name: "Region",
            fieldName: "region",
            type: "text",
            description: "Sales region",
            sortable: true,
            visible: true,
            width: "100px",
          },
          {
            id: "amount",
            name: "Amount",
            fieldName: "amount",
            type: "currency",
            description: "Order amount",
            sortable: true,
            visible: true,
            width: "100px",
          },
          {
            id: "quantity",
            name: "Quantity",
            fieldName: "quantity",
            type: "number",
            description: "Item quantity",
            sortable: true,
            visible: true,
            width: "80px",
          },
        ],
        maxInitialItems: 25,
        enablePagination: true,
        itemsPerPage: 15,
        enableSearch: true,
      },
    },
  },
  render: (args: any) => {
    const { serializedConfig } = args;

    // Sample e-commerce data
    const ecommerceData: CubeDataItem[] = [
      {
        orderId: "ORD-001",
        customerId: "CUST-001",
        product: "Laptop",
        category: "Electronics",
        region: "North",
        amount: 1299.99,
        quantity: 1,
        profit: 259.99,
        rating: 4.5,
        orderDate: "2025-01-01",
      },
      {
        orderId: "ORD-002",
        customerId: "CUST-002",
        product: "Mouse",
        category: "Electronics",
        region: "South",
        amount: 29.99,
        quantity: 2,
        profit: 5.99,
        rating: 4.2,
        orderDate: "2025-01-01",
      },
      {
        orderId: "ORD-003",
        customerId: "CUST-001",
        product: "Keyboard",
        category: "Electronics",
        region: "North",
        amount: 79.99,
        quantity: 1,
        profit: 15.99,
        rating: 4.8,
        orderDate: "2025-01-02",
      },
    ];

    // Create cube configuration from serialized config
    const cubeConfig = useMemo(() => {
      if (!serializedConfig) return null;
      return deserializeCubeConfig(serializedConfig, ecommerceData);
    }, [serializedConfig]);

    // Cube state
    const cubeState = useCubeState({
      data: cubeConfig?.data || [],
      dimensions: cubeConfig?.dimensions || [],
      measures: cubeConfig?.measures || [],
      initialFilters: cubeConfig?.filters,
    });

    if (!cubeConfig) {
      return (
        <div className="p-6">
          <div className="text-center text-slate-500">
            <p>No serialized configuration provided</p>
            <p className="text-sm mt-2">
              Use the Controls panel to edit the serialized config
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-screen border rounded-lg overflow-hidden">
        <CubeProvider
          value={{
            state: cubeState,
            dimensions: cubeConfig?.dimensions || [],
            measures: cubeConfig?.measures || [],
            data: cubeConfig?.data || [],
            reportId: "serialization-story",
          }}
        >
          {/* Left Sidebar - Summary + Sunburst */}
          <LeftSidebar />

          {/* Main Content - Cube View */}
          <div className="flex-1 overflow-hidden">
            <CubeView
              state={cubeState}
              enableDimensionPicker={false}
              enableRawDataView={true}
              showGrandTotals={false}
              renderRawData={(items, _group) => (
                <SerializedCubeListView
                  serializedConfig={serializedConfig}
                  data={items}
                />
              )}
            />
          </div>

          {/* Right Sidebar - Measure Selector + Dimension Breakdowns */}
          <RightSidebar />
        </CubeProvider>
      </div>
    );
  },
};

/**
 * Story: ID-Based Dimensions with Label Mapping
 *
 * Shows how to use ID-based dimensions with label resolution
 * for database scenarios with foreign keys.
 */
export const IdBasedDimensions: Story = {
  args: {
    serializedConfig: {
      metadata: {
        version: "1.0.0",
        createdAt: "2025-01-15T10:00:00.000Z",
        modifiedAt: "2025-01-15T10:00:00.000Z",
        name: "ID-Based Time Tracking",
        description: "Time tracking with ID-based dimensions and label mapping",
      },
      dataSchema: {
        fields: [
          {
            name: "date",
            type: "date",
            description: "Work date",
            nullable: false,
          },
          {
            name: "numHours",
            type: "number",
            description: "Hours worked",
            nullable: false,
          },
          {
            name: "contractorId",
            type: "string",
            description: "Contractor ID",
            nullable: false,
          },
          {
            name: "projectId",
            type: "string",
            description: "Project ID",
            nullable: false,
          },
          {
            name: "taskId",
            type: "string",
            description: "Task ID",
            nullable: false,
          },
        ],
      },
      dimensions: [
        createDimensionWithLabels(
          "contractor",
          "Contractor",
          "contractorId",
          {
            "1": "Passionware Adam Borowski",
            "2": "Adam Witzberg",
            "3": "John Doe",
          },
          {
            description: "Contractor name",
            icon: "👤",
          },
        ),
        createDimensionWithLabels(
          "project",
          "Project",
          "projectId",
          {
            "101": "Passionware Tracker",
            "102": "E-commerce Platform",
            "103": "Mobile App",
          },
          {
            description: "Project name",
            icon: "📁",
          },
        ),
        createDimensionWithLabels(
          "task",
          "Task",
          "taskId",
          {
            "201": "Frontend Development",
            "202": "Backend API",
            "203": "Database Design",
            "204": "Testing",
          },
          {
            description: "Task name",
            icon: "⚡",
          },
        ),
      ],
      measures: [
        {
          id: "totalHours",
          name: "Total Hours",
          fieldName: "numHours",
          aggregationFunction: "sum",
          description: "Sum of hours worked",
        },
        {
          id: "avgHours",
          name: "Average Hours",
          fieldName: "numHours",
          aggregationFunction: "average",
          description: "Average hours per day",
        },
        {
          id: "entryCount",
          name: "Entry Count",
          fieldName: "date",
          aggregationFunction: "count",
          description: "Number of time entries",
        },
      ],
      breakdownMap: {
        "": "contractor",
        "contractor:*": "project",
        "project:*": "task",
      },
      listView: {
        columns: [
          {
            id: "date",
            name: "Date",
            fieldName: "date",
            type: "date",
            description: "Work date",
            sortable: true,
            visible: true,
            width: "120px",
          },
          {
            id: "contractorId",
            name: "Contractor",
            fieldName: "contractorId",
            type: "text",
            description: "Contractor (ID-based)",
            sortable: true,
            visible: true,
            width: "150px",
          },
          {
            id: "projectId",
            name: "Project",
            fieldName: "projectId",
            type: "text",
            description: "Project (ID-based)",
            sortable: true,
            visible: true,
            width: "150px",
          },
          {
            id: "taskId",
            name: "Task",
            fieldName: "taskId",
            type: "text",
            description: "Task (ID-based)",
            sortable: true,
            visible: true,
            width: "150px",
          },
          {
            id: "numHours",
            name: "Hours",
            fieldName: "numHours",
            type: "number",
            description: "Hours worked",
            sortable: true,
            visible: true,
            width: "80px",
          },
        ],
        maxInitialItems: 20,
        enablePagination: true,
        itemsPerPage: 10,
        enableSearch: true,
      },
    },
  },
  render: (args: any) => {
    const { serializedConfig } = args;

    // Sample data with ID-based fields
    const idBasedData: CubeDataItem[] = [
      {
        contractorId: "1",
        projectId: "101",
        taskId: "201",
        numHours: 8.5,
        date: "2025-01-01",
      },
      {
        contractorId: "2",
        projectId: "102",
        taskId: "202",
        numHours: 7.0,
        date: "2025-01-01",
      },
      {
        contractorId: "1",
        projectId: "101",
        taskId: "203",
        numHours: 6.5,
        date: "2025-01-02",
      },
      {
        contractorId: "3",
        projectId: "103",
        taskId: "204",
        numHours: 9.0,
        date: "2025-01-02",
      },
    ];

    // Create cube configuration from serialized config
    const cubeConfig = useMemo(() => {
      if (!serializedConfig) return null;
      return deserializeCubeConfig(serializedConfig, idBasedData);
    }, [serializedConfig]);

    // Cube state
    const cubeState = useCubeState({
      data: cubeConfig?.data || [],
      dimensions: cubeConfig?.dimensions || [],
      measures: cubeConfig?.measures || [],
      initialFilters: cubeConfig?.filters,
    });

    if (!cubeConfig) {
      return (
        <div className="p-6">
          <div className="text-center text-slate-500">
            <p>No serialized configuration provided</p>
            <p className="text-sm mt-2">
              Use the Controls panel to edit the serialized config
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 space-y-6 h-screen flex flex-col">
        <div className="bg-slate-50 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">
            ID-Based Dimensions with Label Mapping
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            This example shows how to use ID-based dimensions with label
            resolution. Perfect for database scenarios where you have foreign
            keys but want to display human-readable labels in the cube
            interface.
          </p>

          <div className="mb-4 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
            <h3 className="font-medium text-blue-800 mb-2">
              Example Label Mapping:
            </h3>
            <div className="text-sm text-blue-700 space-y-1">
              <div>
                <strong>Contractor ID 1:</strong> "Passionware Adam Borowski"
              </div>
              <div>
                <strong>Project ID 101:</strong> "Passionware Tracker"
              </div>
              <div>
                <strong>Task ID 201:</strong> "Frontend Development"
              </div>
            </div>
          </div>

          <div className="mb-4 p-3 bg-green-50 rounded border-l-4 border-green-400">
            <h3 className="font-medium text-green-800 mb-2">
              Configuration Status:
            </h3>
            <p className="text-sm text-green-600 mb-4">
              ✓ Configuration created with {serializedConfig.dimensions.length}{" "}
              dimensions and {serializedConfig.measures.length} measures
            </p>
          </div>
        </div>

        <div className="flex flex-1 border rounded-lg overflow-hidden">
          <CubeProvider
            value={{
              state: cubeState,
              dimensions: cubeConfig?.dimensions || [],
              measures: cubeConfig?.measures || [],
              data: cubeConfig?.data || [],
              reportId: "id-based-story",
            }}
          >
            {/* Left Sidebar - Summary + Sunburst */}
            <LeftSidebar />

            {/* Main Content - Cube View */}
            <div className="flex-1 overflow-hidden">
              <CubeView
                state={cubeState}
                enableDimensionPicker={false}
                enableRawDataView={true}
                showGrandTotals={false}
                renderRawData={(items, _group) => (
                  <SerializedCubeListView
                    serializedConfig={serializedConfig}
                    data={items}
                  />
                )}
              />
            </div>

            {/* Right Sidebar - Measure Selector + Dimension Breakdowns */}
            <RightSidebar />
          </CubeProvider>
        </div>
      </div>
    );
  },
};
