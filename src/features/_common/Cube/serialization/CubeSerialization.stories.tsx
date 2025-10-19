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
import { CubeProvider } from "../CubeContext.tsx";
import {
  CubeLayout,
  CubeDimensionExplorer,
  CubeSummary,
  CubeBreakdownControl,
  CubeHierarchicalBreakdown,
} from "../index.ts";
import { ListView } from "@/features/_common/ListView.tsx";
import type { ColumnDef } from "@tanstack/react-table";
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
    timeEntries: [],
  },
  originalData: [],
};

// Layout wrapper using new Cube components
function CubeLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <CubeLayout
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
      {children}
    </CubeLayout>
  );
}

// Removed RightSidebar - now using CubeDimensionExplorer

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
            reportId: "serialization-story",
          }}
        >
          <CubeLayoutWrapper>
            <CubeView
              state={cubeState}
              enableDimensionPicker={false}
              enableRawDataView={true}
              renderRawData={(items, _group) => (
                <SerializedCubeListView
                  serializedConfig={serializedConfig}
                  data={items}
                />
              )}
            />
          </CubeLayoutWrapper>
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
            reportId: "serialization-story",
          }}
        >
          <CubeLayoutWrapper>
            <CubeView
              state={cubeState}
              enableDimensionPicker={false}
              enableRawDataView={true}
              renderRawData={(items, _group) => (
                <SerializedCubeListView
                  serializedConfig={serializedConfig}
                  data={items}
                />
              )}
            />
          </CubeLayoutWrapper>
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
              reportId: "id-based-story",
            }}
          >
            <CubeLayoutWrapper>
              <CubeView
                state={cubeState}
                enableDimensionPicker={false}
                enableRawDataView={true}
                renderRawData={(items, _group) => (
                  <SerializedCubeListView
                    serializedConfig={serializedConfig}
                    data={items}
                  />
                )}
              />
            </CubeLayoutWrapper>
          </CubeProvider>
        </div>
      </div>
    );
  },
};
