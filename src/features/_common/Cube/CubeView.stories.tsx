/**
 * Storybook examples for CubeView component
 */

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  type CubeConfig,
  cubeService,
  CubeView,
  type DimensionDescriptor,
  type MeasureDescriptor,
} from "@/features/_common/Cube/index.ts";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

// Sample data types
interface SalesTransaction {
  id: string;
  date: string;
  product: string;
  category: string;
  region: string;
  salesperson: string;
  quantity: number;
  unitPrice: number;
  revenue: number;
  cost: number;
}

interface TimeEntry {
  id: string;
  date: string;
  contractor: string;
  project: string;
  role: string;
  task: string;
  hours: number;
  costRate: number;
  billingRate: number;
}

interface ProjectTimeEntry {
  id: string;
  startTime: string;
  endTime: string;
  date: string;
  user: string;
  project: string;
  task: string;
  activity: string;
  notes?: string;
  billable: boolean;
}

// Sample sales data
const salesData: SalesTransaction[] = [
  {
    id: "1",
    date: "2024-01-15",
    product: "Laptop Pro",
    category: "Electronics",
    region: "North",
    salesperson: "Alice Johnson",
    quantity: 5,
    unitPrice: 1200,
    revenue: 6000,
    cost: 4500,
  },
  {
    id: "2",
    date: "2024-01-16",
    product: "Mouse Wireless",
    category: "Accessories",
    region: "North",
    salesperson: "Alice Johnson",
    quantity: 15,
    unitPrice: 25,
    revenue: 375,
    cost: 225,
  },
  {
    id: "3",
    date: "2024-01-17",
    product: "Keyboard Mechanical",
    category: "Accessories",
    region: "South",
    salesperson: "Bob Smith",
    quantity: 8,
    unitPrice: 80,
    revenue: 640,
    cost: 400,
  },
  {
    id: "4",
    date: "2024-01-18",
    product: "Monitor 4K",
    category: "Electronics",
    region: "South",
    salesperson: "Bob Smith",
    quantity: 3,
    unitPrice: 500,
    revenue: 1500,
    cost: 1050,
  },
  {
    id: "5",
    date: "2024-01-19",
    product: "Laptop Pro",
    category: "Electronics",
    region: "East",
    salesperson: "Carol White",
    quantity: 7,
    unitPrice: 1200,
    revenue: 8400,
    cost: 6300,
  },
  {
    id: "6",
    date: "2024-01-20",
    product: "Webcam HD",
    category: "Accessories",
    region: "East",
    salesperson: "Carol White",
    quantity: 12,
    unitPrice: 60,
    revenue: 720,
    cost: 480,
  },
  {
    id: "7",
    date: "2024-01-21",
    product: "Monitor 4K",
    category: "Electronics",
    region: "West",
    salesperson: "David Brown",
    quantity: 4,
    unitPrice: 500,
    revenue: 2000,
    cost: 1400,
  },
  {
    id: "8",
    date: "2024-01-22",
    product: "Keyboard Mechanical",
    category: "Accessories",
    region: "West",
    salesperson: "David Brown",
    quantity: 10,
    unitPrice: 80,
    revenue: 800,
    cost: 500,
  },
];

// Sample time tracking data
const timeData: TimeEntry[] = [
  {
    id: "1",
    date: "2024-01-15",
    contractor: "John Doe",
    project: "Website Redesign",
    role: "Frontend Developer",
    task: "Component Development",
    hours: 8,
    costRate: 50,
    billingRate: 100,
  },
  {
    id: "2",
    date: "2024-01-16",
    contractor: "Jane Smith",
    project: "Website Redesign",
    role: "Designer",
    task: "UI Design",
    hours: 6,
    costRate: 60,
    billingRate: 120,
  },
  {
    id: "3",
    date: "2024-01-17",
    contractor: "John Doe",
    project: "Mobile App",
    role: "Frontend Developer",
    task: "API Integration",
    hours: 7,
    costRate: 50,
    billingRate: 100,
  },
  {
    id: "4",
    date: "2024-01-18",
    contractor: "Mike Johnson",
    project: "Mobile App",
    role: "Backend Developer",
    task: "Database Design",
    hours: 8,
    costRate: 55,
    billingRate: 110,
  },
  {
    id: "5",
    date: "2024-01-19",
    contractor: "Jane Smith",
    project: "Website Redesign",
    role: "Designer",
    task: "UX Research",
    hours: 5,
    costRate: 60,
    billingRate: 120,
  },
];

// Sample project tracking data
const projectTrackingData: ProjectTimeEntry[] = [
  {
    id: "1",
    startTime: "2024-10-07T09:00:00",
    endTime: "2024-10-07T12:30:00",
    date: "2024-10-07",
    user: "Alice Johnson",
    project: "E-commerce Platform",
    task: "Product Catalog",
    activity: "Frontend Development",
    notes: "Implemented product grid and filters",
    billable: true,
  },
  {
    id: "2",
    startTime: "2024-10-07T13:30:00",
    endTime: "2024-10-07T17:00:00",
    date: "2024-10-07",
    user: "Alice Johnson",
    project: "E-commerce Platform",
    task: "Product Catalog",
    activity: "Code Review",
    notes: "Reviewed pull requests",
    billable: true,
  },
  {
    id: "3",
    startTime: "2024-10-07T09:00:00",
    endTime: "2024-10-07T11:00:00",
    date: "2024-10-07",
    user: "Bob Smith",
    project: "E-commerce Platform",
    task: "Shopping Cart",
    activity: "Backend Development",
    notes: "Cart API endpoints",
    billable: true,
  },
  {
    id: "4",
    startTime: "2024-10-07T11:15:00",
    endTime: "2024-10-07T13:00:00",
    date: "2024-10-07",
    user: "Bob Smith",
    project: "Internal Tools",
    task: "Admin Dashboard",
    activity: "Bug Fixing",
    notes: "Fixed dashboard loading issues",
    billable: false,
  },
  {
    id: "5",
    startTime: "2024-10-07T14:00:00",
    endTime: "2024-10-07T18:00:00",
    date: "2024-10-07",
    user: "Bob Smith",
    project: "E-commerce Platform",
    task: "Payment Integration",
    activity: "Backend Development",
    notes: "Stripe integration",
    billable: true,
  },
  {
    id: "6",
    startTime: "2024-10-07T09:30:00",
    endTime: "2024-10-07T12:00:00",
    date: "2024-10-07",
    user: "Carol White",
    project: "Mobile App",
    task: "User Authentication",
    activity: "Frontend Development",
    notes: "Login and signup screens",
    billable: true,
  },
  {
    id: "7",
    startTime: "2024-10-07T13:00:00",
    endTime: "2024-10-07T16:30:00",
    date: "2024-10-07",
    user: "Carol White",
    project: "Mobile App",
    task: "User Authentication",
    activity: "Testing",
    notes: "E2E tests for auth flows",
    billable: true,
  },
  {
    id: "8",
    startTime: "2024-10-07T10:00:00",
    endTime: "2024-10-07T12:00:00",
    date: "2024-10-07",
    user: "David Brown",
    project: "E-commerce Platform",
    task: "Product Catalog",
    activity: "UI/UX Design",
    notes: "Product detail page mockups",
    billable: true,
  },
  {
    id: "9",
    startTime: "2024-10-07T14:00:00",
    endTime: "2024-10-07T15:30:00",
    date: "2024-10-07",
    user: "David Brown",
    project: "Internal Tools",
    task: "Team Meetings",
    activity: "Planning",
    notes: "Sprint planning session",
    billable: false,
  },
  {
    id: "10",
    startTime: "2024-10-07T09:00:00",
    endTime: "2024-10-07T10:30:00",
    date: "2024-10-07",
    user: "Eve Davis",
    project: "Mobile App",
    task: "Push Notifications",
    activity: "Backend Development",
    notes: "FCM integration",
    billable: true,
  },
  {
    id: "11",
    startTime: "2024-10-07T11:00:00",
    endTime: "2024-10-07T13:30:00",
    date: "2024-10-07",
    user: "Eve Davis",
    project: "Mobile App",
    task: "Push Notifications",
    activity: "Testing",
    notes: "Notification delivery tests",
    billable: true,
  },
  {
    id: "12",
    startTime: "2024-10-07T14:30:00",
    endTime: "2024-10-07T17:00:00",
    date: "2024-10-07",
    user: "Eve Davis",
    project: "E-commerce Platform",
    task: "Order Management",
    activity: "Backend Development",
    notes: "Order status tracking",
    billable: true,
  },
];

// Define dimensions for sales data
const salesDimensions: DimensionDescriptor<SalesTransaction>[] = [
  {
    id: "region",
    name: "Region",
    icon: "🌍",
    getValue: (item) => item.region,
  },
  {
    id: "category",
    name: "Category",
    icon: "📦",
    getValue: (item) => item.category,
  },
  {
    id: "product",
    name: "Product",
    icon: "🏷️",
    getValue: (item) => item.product,
  },
  {
    id: "salesperson",
    name: "Salesperson",
    icon: "👤",
    getValue: (item) => item.salesperson,
  },
];

// Define measures for sales data
const salesMeasures: MeasureDescriptor<SalesTransaction>[] = [
  {
    id: "revenue",
    name: "Revenue",
    icon: "💰",
    getValue: (item) => item.revenue,
    aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
    formatValue: (value) => `$${value.toLocaleString()}`,
  },
  {
    id: "cost",
    name: "Cost",
    icon: "💸",
    getValue: (item) => item.cost,
    aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
    formatValue: (value) => `$${value.toLocaleString()}`,
  },
  {
    id: "profit",
    name: "Profit",
    icon: "📈",
    getValue: (item) => item.revenue - item.cost,
    aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
    formatValue: (value) => `$${value.toLocaleString()}`,
  },
  {
    id: "quantity",
    name: "Quantity",
    icon: "📊",
    getValue: (item) => item.quantity,
    aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
    formatValue: (value) => `${value} units`,
  },
];

// Define dimensions for time data
const timeDimensions: DimensionDescriptor<TimeEntry>[] = [
  {
    id: "project",
    name: "Project",
    icon: "📁",
    getValue: (item) => item.project,
  },
  {
    id: "contractor",
    name: "Contractor",
    icon: "👥",
    getValue: (item) => item.contractor,
  },
  {
    id: "role",
    name: "Role",
    icon: "🎭",
    getValue: (item) => item.role,
  },
  {
    id: "task",
    name: "Task",
    icon: "📋",
    getValue: (item) => item.task,
  },
];

// Define measures for time data
const timeMeasures: MeasureDescriptor<TimeEntry>[] = [
  {
    id: "hours",
    name: "Hours",
    icon: "⏱️",
    getValue: (item) => item.hours,
    aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
    formatValue: (value) => `${value.toFixed(1)}h`,
  },
  {
    id: "cost",
    name: "Cost",
    icon: "💸",
    getValue: (item) => item.hours * item.costRate,
    aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
    formatValue: (value) => `$${value.toFixed(2)}`,
  },
  {
    id: "billing",
    name: "Billing",
    icon: "💰",
    getValue: (item) => item.hours * item.billingRate,
    aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
    formatValue: (value) => `$${value.toFixed(2)}`,
  },
  {
    id: "profit",
    name: "Profit",
    icon: "📈",
    getValue: (item) => item.hours * (item.billingRate - item.costRate),
    aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
    formatValue: (value) => `$${value.toFixed(2)}`,
  },
];

// Helper: Calculate duration in hours from start/end time
const calculateDuration = (startTime: string, endTime: string): number => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
};

// Helper: Format time
const formatTime = (timeStr: string): string => {
  const date = new Date(timeStr);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Define dimensions for project tracking
const projectTrackingDimensions: DimensionDescriptor<ProjectTimeEntry>[] = [
  {
    id: "user",
    name: "User",
    icon: "👤",
    getValue: (item) => item.user,
  },
  {
    id: "project",
    name: "Project",
    icon: "📁",
    getValue: (item) => item.project,
  },
  {
    id: "task",
    name: "Task",
    icon: "📋",
    getValue: (item) => item.task,
  },
  {
    id: "activity",
    name: "Activity",
    icon: "🎯",
    getValue: (item) => item.activity,
  },
  {
    id: "billable",
    name: "Billable Status",
    icon: "💵",
    getValue: (item) => item.billable,
    formatValue: (value) => (value ? "Billable" : "Non-Billable"),
    getKey: (value) => String(value),
  },
];

// Define measures for project tracking
const projectTrackingMeasures: MeasureDescriptor<ProjectTimeEntry>[] = [
  {
    id: "totalHours",
    name: "Total Hours",
    icon: "⏱️",
    getValue: (item) => calculateDuration(item.startTime, item.endTime),
    aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
    formatValue: (value) => `${value.toFixed(2)}h`,
  },
  {
    id: "entryCount",
    name: "Entry Count",
    icon: "📊",
    getValue: () => 1,
    aggregate: (values) => values.length,
    formatValue: (value) => `${value} entries`,
  },
  {
    id: "avgDuration",
    name: "Avg Duration",
    icon: "📉",
    getValue: (item) => calculateDuration(item.startTime, item.endTime),
    aggregate: (values) =>
      values.length > 0
        ? values.reduce((sum, v) => sum + v, 0) / values.length
        : 0,
    formatValue: (value) => `${value.toFixed(2)}h`,
  },
  {
    id: "billableHours",
    name: "Billable Hours",
    icon: "💰",
    getValue: (item) =>
      item.billable ? calculateDuration(item.startTime, item.endTime) : 0,
    aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
    formatValue: (value) => `${value.toFixed(2)}h`,
  },
  {
    id: "nonBillableHours",
    name: "Non-Billable Hours",
    icon: "🕒",
    getValue: (item) =>
      !item.billable ? calculateDuration(item.startTime, item.endTime) : 0,
    aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
    formatValue: (value) => `${value.toFixed(2)}h`,
  },
];

const meta: Meta<typeof CubeView> = {
  component: CubeView,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof CubeView>;

// Story 1: Basic sales cube grouped by region
export const SalesByRegion: Story = {
  render: () => {
    const [groupBy, setGroupBy] = useState<string[]>(["region"]);

    const config: CubeConfig<SalesTransaction> = {
      data: salesData,
      dimensions: salesDimensions,
      measures: salesMeasures,
      groupBy: groupBy,
      activeMeasures: ["revenue", "profit"],
    };

    const cube = cubeService.calculateCube(config);

    const handleDimensionChange = (dimensionId: string, level: number) => {
      const newGroupBy = [...groupBy];
      newGroupBy[level] = dimensionId;
      setGroupBy(newGroupBy.slice(0, level + 1));
    };

    return (
      <CubeView
        cube={cube}
        enableDimensionPicker={true}
        onDimensionChange={handleDimensionChange}
      />
    );
  },
};

// Story 2: Multi-level grouping (region > category)
export const SalesByRegionAndCategory: Story = {
  render: () => {
    const [groupBy, setGroupBy] = useState<string[]>([
      "region",
      "category",
      "product",
    ]);

    const config: CubeConfig<SalesTransaction> = {
      data: salesData,
      dimensions: salesDimensions,
      measures: salesMeasures,
      groupBy: groupBy,
      activeMeasures: ["revenue", "cost", "profit"],
    };

    const cube = cubeService.calculateCube(config, { includeItems: true });

    const handleDimensionChange = (dimensionId: string, level: number) => {
      const newGroupBy = [...groupBy];
      newGroupBy[level] = dimensionId;
      setGroupBy(newGroupBy.slice(0, level + 1));
    };

    return (
      <CubeView
        cube={cube}
        maxInitialDepth={2}
        enableZoomIn={true}
        enableDimensionPicker={true}
        enableRawDataView={true}
        onDimensionChange={handleDimensionChange}
      />
    );
  },
};

// Story 3: Interactive cube with filter controls
export const InteractiveSalesCube: Story = {
  render: () => {
    const [groupBy, setGroupBy] = useState<string[]>(["region"]);
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

    const config: CubeConfig<SalesTransaction> = {
      data: salesData,
      dimensions: salesDimensions,
      measures: salesMeasures,
      groupBy,
      activeMeasures: ["revenue", "profit", "quantity"],
      filters: selectedRegion
        ? [{ dimensionId: "region", operator: "equals", value: selectedRegion }]
        : [],
    };

    const cube = cubeService.calculateCube(config);

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Interactive Sales Cube</CardTitle>
            <CardDescription>
              Change grouping and filters to explore the data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Group By:
              </label>
              <div className="flex gap-2">
                <Button
                  variant={groupBy[0] === "region" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGroupBy(["region"])}
                >
                  🌍 Region
                </Button>
                <Button
                  variant={groupBy[0] === "category" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGroupBy(["category"])}
                >
                  📦 Category
                </Button>
                <Button
                  variant={groupBy[0] === "salesperson" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGroupBy(["salesperson"])}
                >
                  👤 Salesperson
                </Button>
                <Button
                  variant={
                    groupBy[0] === "region" && groupBy[1] === "category"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => setGroupBy(["region", "category"])}
                >
                  🌍 Region → 📦 Category
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Filter:</label>
              <div className="flex gap-2">
                <Button
                  variant={selectedRegion === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedRegion(null)}
                >
                  All Regions
                </Button>
                <Button
                  variant={selectedRegion === "North" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedRegion("North")}
                >
                  North
                </Button>
                <Button
                  variant={selectedRegion === "South" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedRegion("South")}
                >
                  South
                </Button>
                <Button
                  variant={selectedRegion === "East" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedRegion("East")}
                >
                  East
                </Button>
                <Button
                  variant={selectedRegion === "West" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedRegion("West")}
                >
                  West
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <CubeView
          cube={cube}
          enableZoomIn={true}
          enableDimensionPicker={true}
          enableRawDataView={true}
          onDimensionChange={(dimensionId, level) => {
            const newGroupBy = [...groupBy];
            newGroupBy[level] = dimensionId;
            setGroupBy(newGroupBy.slice(0, level + 1));
          }}
        />
      </div>
    );
  },
};

// Story 4: Time tracking cube
export const TimeTrackingCube: Story = {
  render: () => {
    const [groupBy, setGroupBy] = useState<string[]>([
      "project",
      "contractor",
      "role",
    ]);

    const config: CubeConfig<TimeEntry> = {
      data: timeData,
      dimensions: timeDimensions,
      measures: timeMeasures,
      groupBy: groupBy,
      activeMeasures: ["hours", "cost", "billing", "profit"],
    };

    const cube = cubeService.calculateCube(config, { includeItems: true });

    const handleDimensionChange = (dimensionId: string, level: number) => {
      const newGroupBy = [...groupBy];
      newGroupBy[level] = dimensionId;
      setGroupBy(newGroupBy.slice(0, level + 1));
    };

    return (
      <CubeView
        cube={cube}
        maxInitialDepth={2}
        enableZoomIn={true}
        enableDimensionPicker={true}
        enableRawDataView={true}
        onDimensionChange={handleDimensionChange}
      />
    );
  },
};

// Story 5: Custom rendering
export const CustomRendering: Story = {
  render: () => {
    const [groupBy, setGroupBy] = useState<string[]>(["region", "category"]);

    const config: CubeConfig<SalesTransaction> = {
      data: salesData,
      dimensions: salesDimensions,
      measures: salesMeasures,
      groupBy: groupBy,
      activeMeasures: ["revenue", "profit"],
    };

    const cube = cubeService.calculateCube(config);

    const handleDimensionChange = (dimensionId: string, level: number) => {
      const newGroupBy = [...groupBy];
      newGroupBy[level] = dimensionId;
      setGroupBy(newGroupBy.slice(0, level + 1));
    };

    return (
      <CubeView
        cube={cube}
        enableDimensionPicker={true}
        onDimensionChange={handleDimensionChange}
        renderGroupHeader={(group, level) => (
          <div className="flex items-center gap-2">
            <Badge variant={level === 0 ? "primary" : "secondary"}>
              {level === 0 ? "Region" : "Category"}
            </Badge>
            <h4 className="font-medium">{group.dimensionLabel}</h4>
            <span className="text-sm text-slate-500">
              ({group.itemCount} transactions)
            </span>
          </div>
        )}
        renderCell={(cell, _group) => {
          const isProfit = cell.measureId === "profit";
          const value = cell.value as number;
          const isPositive = value > 0;

          return (
            <div
              className={`text-sm font-medium ${
                isProfit ? (isPositive ? "text-green-600" : "text-red-600") : ""
              }`}
            >
              {cell.formattedValue}
            </div>
          );
        }}
      />
    );
  },
};

// Story 6: All measures
export const AllMeasures: Story = {
  render: () => {
    const [groupBy, setGroupBy] = useState<string[]>(["project"]);

    const config: CubeConfig<TimeEntry> = {
      data: timeData,
      dimensions: timeDimensions,
      measures: timeMeasures,
      groupBy: groupBy,
      // All measures active (default)
    };

    const cube = cubeService.calculateCube(config);

    const handleDimensionChange = (dimensionId: string, level: number) => {
      const newGroupBy = [...groupBy];
      newGroupBy[level] = dimensionId;
      setGroupBy(newGroupBy.slice(0, level + 1));
    };

    return (
      <CubeView
        cube={cube}
        enableDimensionPicker={true}
        onDimensionChange={handleDimensionChange}
      />
    );
  },
};

// Story 7: No grouping (grand totals only)
export const GrandTotalsOnly: Story = {
  render: () => {
    const [groupBy, setGroupBy] = useState<string[]>([]);

    const config: CubeConfig<SalesTransaction> = {
      data: salesData,
      dimensions: salesDimensions,
      measures: salesMeasures,
      groupBy: groupBy, // No grouping
    };

    const cube = cubeService.calculateCube(config);

    const handleDimensionChange = (dimensionId: string, level: number) => {
      const newGroupBy = [...groupBy];
      newGroupBy[level] = dimensionId;
      setGroupBy(newGroupBy.slice(0, level + 1));
    };

    return (
      <CubeView
        cube={cube}
        enableDimensionPicker={true}
        onDimensionChange={handleDimensionChange}
      />
    );
  },
};

// Story 8: With raw data viewing
export const WithRawDataView: Story = {
  render: () => {
    const [groupBy, setGroupBy] = useState<string[]>(["region", "category"]);

    const config: CubeConfig<SalesTransaction> = {
      data: salesData,
      dimensions: salesDimensions,
      measures: salesMeasures,
      groupBy: groupBy,
      activeMeasures: ["revenue", "profit"],
    };

    // IMPORTANT: Set includeItems to true to enable raw data viewing
    const cube = cubeService.calculateCube(config, {
      includeItems: true,
    });

    const handleDimensionChange = (dimensionId: string, level: number) => {
      const newGroupBy = [...groupBy];
      newGroupBy[level] = dimensionId;
      setGroupBy(newGroupBy.slice(0, level + 1));
    };

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Raw Data Viewing Example</CardTitle>
            <CardDescription>
              Click the "📊 Data" button on any group to view the raw data items
            </CardDescription>
          </CardHeader>
        </Card>

        <CubeView
          cube={cube}
          enableDimensionPicker={true}
          enableRawDataView={true}
          maxInitialDepth={1}
          onDimensionChange={handleDimensionChange}
        />
      </div>
    );
  },
};

// Story 9: Custom raw data rendering
export const CustomRawDataRendering: Story = {
  render: () => {
    const [groupBy, setGroupBy] = useState<string[]>(["region"]);

    const config: CubeConfig<SalesTransaction> = {
      data: salesData,
      dimensions: salesDimensions,
      measures: salesMeasures,
      groupBy: groupBy,
      activeMeasures: ["revenue", "profit", "quantity"],
    };

    const cube = cubeService.calculateCube(config, {
      includeItems: true,
    });

    const handleDimensionChange = (dimensionId: string, level: number) => {
      const newGroupBy = [...groupBy];
      newGroupBy[level] = dimensionId;
      setGroupBy(newGroupBy.slice(0, level + 1));
    };

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Custom Raw Data Rendering</CardTitle>
            <CardDescription>
              Custom table view for raw data items
            </CardDescription>
          </CardHeader>
        </Card>

        <CubeView
          cube={cube}
          enableDimensionPicker={true}
          enableRawDataView={true}
          onDimensionChange={handleDimensionChange}
          renderRawData={(items, group) => (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="text-left p-2 border">Date</th>
                    <th className="text-left p-2 border">Product</th>
                    <th className="text-left p-2 border">Salesperson</th>
                    <th className="text-right p-2 border">Quantity</th>
                    <th className="text-right p-2 border">Revenue</th>
                    <th className="text-right p-2 border">Cost</th>
                    <th className="text-right p-2 border">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const sales = item as SalesTransaction;
                    const profit = sales.revenue - sales.cost;
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 border">{sales.date}</td>
                        <td className="p-2 border">{sales.product}</td>
                        <td className="p-2 border">{sales.salesperson}</td>
                        <td className="text-right p-2 border">
                          {sales.quantity}
                        </td>
                        <td className="text-right p-2 border">
                          ${sales.revenue.toLocaleString()}
                        </td>
                        <td className="text-right p-2 border">
                          ${sales.cost.toLocaleString()}
                        </td>
                        <td
                          className={`text-right p-2 border ${
                            profit >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          ${profit.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-semibold">
                  <tr>
                    <td colSpan={3} className="p-2 border">
                      Total for {group.dimensionLabel}
                    </td>
                    <td className="text-right p-2 border">
                      {items.reduce(
                        (sum, item) =>
                          sum + (item as SalesTransaction).quantity,
                        0,
                      )}
                    </td>
                    <td className="text-right p-2 border">
                      $
                      {items
                        .reduce(
                          (sum, item) =>
                            sum + (item as SalesTransaction).revenue,
                          0,
                        )
                        .toLocaleString()}
                    </td>
                    <td className="text-right p-2 border">
                      $
                      {items
                        .reduce(
                          (sum, item) => sum + (item as SalesTransaction).cost,
                          0,
                        )
                        .toLocaleString()}
                    </td>
                    <td className="text-right p-2 border text-green-600">
                      $
                      {items
                        .reduce(
                          (sum, item) =>
                            sum +
                            ((item as SalesTransaction).revenue -
                              (item as SalesTransaction).cost),
                          0,
                        )
                        .toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        />
      </div>
    );
  },
};

// Story 10: Project Tracking by User
export const ProjectTrackingByUser: Story = {
  render: () => {
    const [groupBy, setGroupBy] = useState<string[]>([
      "user",
      "project",
      "task",
    ]);

    const config: CubeConfig<ProjectTimeEntry> = {
      data: projectTrackingData,
      dimensions: projectTrackingDimensions,
      measures: projectTrackingMeasures,
      groupBy: groupBy,
      activeMeasures: ["totalHours", "billableHours", "entryCount"],
    };

    const cube = cubeService.calculateCube(config, { includeItems: true });

    const handleDimensionChange = (dimensionId: string, level: number) => {
      const newGroupBy = [...groupBy];
      newGroupBy[level] = dimensionId;
      setGroupBy(newGroupBy.slice(0, level + 1));
    };

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Project Tracking - By User</CardTitle>
            <CardDescription>
              Track time entries grouped by user and project with zoom
              navigation
            </CardDescription>
          </CardHeader>
        </Card>

        <CubeView
          cube={cube}
          maxInitialDepth={1}
          enableZoomIn={true}
          enableDimensionPicker={true}
          enableRawDataView={true}
          onDimensionChange={handleDimensionChange}
        />
      </div>
    );
  },
};

// Story 11: Project Tracking by Project → Task → Activity
export const ProjectTrackingHierarchy: Story = {
  render: () => {
    const [groupBy, setGroupBy] = useState<string[]>([
      "project",
      "task",
      "activity",
    ]);

    const config: CubeConfig<ProjectTimeEntry> = {
      data: projectTrackingData,
      dimensions: projectTrackingDimensions,
      measures: projectTrackingMeasures,
      groupBy: groupBy,
      activeMeasures: ["totalHours", "billableHours", "avgDuration"],
    };

    const cube = cubeService.calculateCube(config, { includeItems: true });

    const handleDimensionChange = (dimensionId: string, level: number) => {
      const newGroupBy = [...groupBy];
      newGroupBy[level] = dimensionId;
      setGroupBy(newGroupBy.slice(0, level + 1));
    };

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Project Hierarchy View</CardTitle>
            <CardDescription>
              Project → Task → Activity breakdown with zoom navigation and raw
              data
            </CardDescription>
          </CardHeader>
        </Card>

        <CubeView
          cube={cube}
          maxInitialDepth={2}
          enableZoomIn={true}
          enableDimensionPicker={true}
          enableRawDataView={true}
          onDimensionChange={handleDimensionChange}
        />
      </div>
    );
  },
};

// Story 12: Project Tracking with Raw Data View
export const ProjectTrackingWithRawData: Story = {
  render: () => {
    const [groupBy, setGroupBy] = useState<string[]>(["project", "user"]);

    const config: CubeConfig<ProjectTimeEntry> = {
      data: projectTrackingData,
      dimensions: projectTrackingDimensions,
      measures: projectTrackingMeasures,
      groupBy: groupBy,
      activeMeasures: ["totalHours", "billableHours"],
    };

    const cube = cubeService.calculateCube(config, {
      includeItems: true,
    });

    const handleDimensionChange = (dimensionId: string, level: number) => {
      const newGroupBy = [...groupBy];
      newGroupBy[level] = dimensionId;
      setGroupBy(newGroupBy.slice(0, level + 1));
    };

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Project Tracking with Time Entries</CardTitle>
            <CardDescription>
              Click "📊 Data" to view detailed time entries with start/end times
            </CardDescription>
          </CardHeader>
        </Card>

        <CubeView
          cube={cube}
          enableDimensionPicker={true}
          enableRawDataView={true}
          onDimensionChange={handleDimensionChange}
          renderRawData={(items, group) => (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="text-left p-2 border">User</th>
                    <th className="text-left p-2 border">Task</th>
                    <th className="text-left p-2 border">Activity</th>
                    <th className="text-left p-2 border">Start Time</th>
                    <th className="text-left p-2 border">End Time</th>
                    <th className="text-right p-2 border">Duration</th>
                    <th className="text-center p-2 border">Billable</th>
                    <th className="text-left p-2 border">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const entry = item as ProjectTimeEntry;
                    const duration = calculateDuration(
                      entry.startTime,
                      entry.endTime,
                    );
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 border">{entry.user}</td>
                        <td className="p-2 border">{entry.task}</td>
                        <td className="p-2 border">{entry.activity}</td>
                        <td className="p-2 border">
                          {formatTime(entry.startTime)}
                        </td>
                        <td className="p-2 border">
                          {formatTime(entry.endTime)}
                        </td>
                        <td className="text-right p-2 border">
                          {duration.toFixed(2)}h
                        </td>
                        <td className="text-center p-2 border">
                          {entry.billable ? (
                            <Badge variant="success" className="text-xs">
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              No
                            </Badge>
                          )}
                        </td>
                        <td className="p-2 border text-xs text-slate-600">
                          {entry.notes || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-semibold">
                  <tr>
                    <td colSpan={5} className="p-2 border">
                      Total for {group.dimensionLabel}
                    </td>
                    <td className="text-right p-2 border">
                      {items
                        .reduce(
                          (sum, item) =>
                            sum +
                            calculateDuration(
                              (item as ProjectTimeEntry).startTime,
                              (item as ProjectTimeEntry).endTime,
                            ),
                          0,
                        )
                        .toFixed(2)}
                      h
                    </td>
                    <td colSpan={2} className="p-2 border">
                      {
                        items.filter(
                          (item) => (item as ProjectTimeEntry).billable,
                        ).length
                      }{" "}
                      billable
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        />
      </div>
    );
  },
};

// Story 13: Billable vs Non-Billable Analysis
export const BillableAnalysis: Story = {
  render: () => {
    const [groupBy, setGroupBy] = useState<string[]>(["billable", "project"]);

    const config: CubeConfig<ProjectTimeEntry> = {
      data: projectTrackingData,
      dimensions: projectTrackingDimensions,
      measures: projectTrackingMeasures,
      groupBy: groupBy,
      activeMeasures: ["totalHours", "entryCount"],
    };

    const cube = cubeService.calculateCube(config);

    const handleDimensionChange = (dimensionId: string, level: number) => {
      const newGroupBy = [...groupBy];
      newGroupBy[level] = dimensionId;
      setGroupBy(newGroupBy.slice(0, level + 1));
    };

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Billable vs Non-Billable Analysis</CardTitle>
            <CardDescription>
              Compare billable and non-billable hours across projects
            </CardDescription>
          </CardHeader>
        </Card>

        <CubeView
          cube={cube}
          maxInitialDepth={2}
          enableDimensionPicker={true}
          onDimensionChange={handleDimensionChange}
          renderCell={(cell, group) => {
            // Highlight billable hours in green
            const isBillableGroup = group.dimensionLabel === "Billable";
            const isHoursCell = cell.measureId === "totalHours";

            return (
              <div
                className={
                  isBillableGroup && isHoursCell
                    ? "text-green-600 font-semibold"
                    : ""
                }
              >
                {cell.formattedValue}
              </div>
            );
          }}
        />
      </div>
    );
  },
};

// Story 14: Interactive Project Tracking Dashboard
export const InteractiveProjectDashboard: Story = {
  render: () => {
    const [groupBy, setGroupBy] = useState<string[]>(["project", "user"]);
    const [selectedMeasures, setSelectedMeasures] = useState<string[]>([
      "totalHours",
      "billableHours",
    ]);
    const [filterBillable, setFilterBillable] = useState<boolean | null>(null);

    const config: CubeConfig<ProjectTimeEntry> = {
      data: projectTrackingData,
      dimensions: projectTrackingDimensions,
      measures: projectTrackingMeasures,
      groupBy,
      activeMeasures: selectedMeasures,
      filters:
        filterBillable !== null
          ? [
              {
                dimensionId: "billable",
                operator: "equals",
                value: filterBillable,
              },
            ]
          : [],
    };

    const cube = cubeService.calculateCube(config);

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Interactive Project Tracking Dashboard</CardTitle>
            <CardDescription>
              Customize grouping, metrics, and filters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Grouping Controls */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Group By:
              </label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={
                    groupBy[0] === "project" && groupBy[1] === "user"
                      ? "default"
                      : "secondary"
                  }
                  size="sm"
                  onClick={() => setGroupBy(["project", "user"])}
                >
                  📁 Project → 👤 User
                </Button>
                <Button
                  variant={
                    groupBy[0] === "user" && groupBy[1] === "project"
                      ? "default"
                      : "secondary"
                  }
                  size="sm"
                  onClick={() => setGroupBy(["user", "project"])}
                >
                  👤 User → 📁 Project
                </Button>
                <Button
                  variant={
                    groupBy[0] === "project" &&
                    groupBy[1] === "task" &&
                    groupBy[2] === "activity"
                      ? "default"
                      : "secondary"
                  }
                  size="sm"
                  onClick={() => setGroupBy(["project", "task", "activity"])}
                >
                  📁 → 📋 → 🎯
                </Button>
                <Button
                  variant={
                    groupBy[0] === "activity" && groupBy.length === 1
                      ? "default"
                      : "secondary"
                  }
                  size="sm"
                  onClick={() => setGroupBy(["activity"])}
                >
                  🎯 Activity Only
                </Button>
              </div>
            </div>

            {/* Metrics Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Metrics:</label>
              <div className="flex gap-2 flex-wrap">
                {projectTrackingMeasures.map((measure) => (
                  <Button
                    key={measure.id}
                    variant={
                      selectedMeasures.includes(measure.id)
                        ? "default"
                        : "secondary"
                    }
                    size="sm"
                    onClick={() => {
                      setSelectedMeasures((prev) =>
                        prev.includes(measure.id)
                          ? prev.filter((m) => m !== measure.id)
                          : [...prev, measure.id],
                      );
                    }}
                  >
                    {measure.icon} {measure.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Filter Controls */}
            <div>
              <label className="text-sm font-medium mb-2 block">Filter:</label>
              <div className="flex gap-2">
                <Button
                  variant={filterBillable === null ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setFilterBillable(null)}
                >
                  All Entries
                </Button>
                <Button
                  variant={filterBillable === true ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setFilterBillable(true)}
                >
                  💰 Billable Only
                </Button>
                <Button
                  variant={filterBillable === false ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setFilterBillable(false)}
                >
                  🕒 Non-Billable Only
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <CubeView
          cube={cube}
          maxInitialDepth={1}
          enableDimensionPicker={true}
          onDimensionChange={(dimensionId, level) => {
            const newGroupBy = [...groupBy];
            newGroupBy[level] = dimensionId;
            setGroupBy(newGroupBy.slice(0, level + 1));
          }}
        />
      </div>
    );
  },
};

/**
 * Story 15: Zoom-In Navigation with Dynamic Dimension Picker
 */
export const ZoomInNavigation: Story = {
  render: () => {
    const [groupBy, setGroupBy] = useState<string[]>([
      "region",
      "category",
      "product",
    ]);

    const config: CubeConfig<SalesTransaction> = {
      data: salesData,
      dimensions: salesDimensions,
      measures: salesMeasures,
      groupBy: groupBy,
      activeMeasures: ["totalRevenue", "profit", "transactionCount"],
    };

    const cube = cubeService.calculateCube(config, {
      includeItems: true,
    });

    const handleDimensionChange = (dimensionId: string, level: number) => {
      const newGroupBy = [...groupBy];
      newGroupBy[level] = dimensionId;
      setGroupBy(newGroupBy.slice(0, level + 1));
    };

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>
              🔍 Zoom-In Navigation + 🎛️ Dynamic Dimension Picker
            </CardTitle>
            <CardDescription>
              This example shows nested subgroups (Region → Category → Product).
              Click "Zoom In" to focus on a group, use breadcrumbs to navigate
              back, or change dimensions from the dropdown.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <div>
                <strong>Current breakdown:</strong>{" "}
                {groupBy
                  .map((id) => {
                    const dim = salesDimensions.find((d) => d.id === id);
                    return dim ? `${dim.icon} ${dim.name}` : id;
                  })
                  .join(" → ") || "None selected"}
              </div>
              <div className="text-xs text-slate-600">
                <strong>Features to try:</strong>
              </div>
              <ul className="text-xs text-slate-600 space-y-1 ml-4">
                <li>
                  📂 <strong>Expand groups</strong> - Click any group to see its
                  subgroups
                </li>
                <li>
                  🔍 <strong>Zoom In</strong> - Click "Zoom In" button to focus
                  on that group only
                </li>
                <li>
                  🏠 <strong>Navigate back</strong> - Click breadcrumbs to go
                  back up the hierarchy
                </li>
                <li>
                  🎛️ <strong>Change dimension</strong> - Use dropdown to rebuild
                  with different breakdown
                </li>
                <li>
                  📊 <strong>View data</strong> - Click "Data" button to see raw
                  entries
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <CubeView
          cube={cube}
          enableZoomIn={true}
          enableDimensionPicker={true}
          enableRawDataView={true}
          maxInitialDepth={1}
          onDimensionChange={handleDimensionChange}
          onZoomIn={(group, fullPath) => {
            console.log("Zoomed into:", group.dimensionLabel);
            console.log(
              "Full path:",
              fullPath.map((b) => `${b.dimensionId}=${b.label}`).join(" > "),
            );
            console.log(
              "Path details:",
              fullPath.map((b) => ({
                dimension: b.dimensionId,
                value: b.dimensionValue,
                key: b.dimensionKey,
              })),
            );
          }}
        />
      </div>
    );
  },
};

/**
 * Story 16: Dynamic Dimension Picker
 */
export const DynamicDimensionPicker: Story = {
  render: () => {
    const [groupBy, setGroupBy] = useState<string[]>(["region"]);

    const config: CubeConfig<SalesTransaction> = {
      data: salesData,
      dimensions: salesDimensions,
      measures: salesMeasures,
      groupBy: groupBy,
      activeMeasures: ["totalRevenue", "profit"],
    };

    const cube = cubeService.calculateCube(config, {
      includeItems: true,
    });

    const handleDimensionChange = (dimensionId: string, level: number) => {
      const newGroupBy = [...groupBy];
      newGroupBy[level] = dimensionId;
      // Remove any dimensions after this level
      setGroupBy(newGroupBy.slice(0, level + 1));
    };

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>🎛️ Dynamic Dimension Picker</CardTitle>
            <CardDescription>
              Choose which dimension to break down by at each level. Select from
              the dropdown to change the current breakdown.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <div>
                <strong>Current breakdown:</strong>{" "}
                {groupBy
                  .map((id) => {
                    const dim = salesDimensions.find((d) => d.id === id);
                    return dim ? `${dim.icon} ${dim.name}` : id;
                  })
                  .join(" → ") || "None"}
              </div>
              <div className="text-xs text-slate-600">
                Available dimensions: Region, Category, Product, Salesperson
              </div>
            </div>
          </CardContent>
        </Card>

        <CubeView
          cube={cube}
          enableDimensionPicker={true}
          enableZoomIn={true}
          enableRawDataView={true}
          maxInitialDepth={1}
          onDimensionChange={handleDimensionChange}
          onZoomIn={(_group, fullPath) => {
            console.log(
              "Zoomed into:",
              fullPath.map((b) => `${b.dimensionId}=${b.label}`).join(" > "),
            );
          }}
        />
      </div>
    );
  },
};
