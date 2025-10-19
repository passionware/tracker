/**
 * Quick Start Example - Copy this to get started with CubeService
 *
 * This file demonstrates the minimal code needed to create a working cube.
 * Adapt the types, dimensions, and measures to your needs.
 */

import {
  CubeView,
  useCubeState,
  type DimensionDescriptor,
  type MeasureDescriptor,
} from "@/features/_common/Cube/index.ts";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";

// ============================================================================
// 1. DEFINE YOUR DATA TYPE
// ============================================================================
interface SalesRecord {
  id: string;
  date: string;
  region: string;
  product: string;
  salesperson: string;
  quantity: number;
  revenue: number;
  cost: number;
}

// ============================================================================
// 2. DEFINE DIMENSIONS (what you can group by)
// ============================================================================
const dimensions: DimensionDescriptor<SalesRecord>[] = [
  {
    id: "region",
    name: "Region",
    icon: "🌍",
    getValue: (item) => item.region,
    // Optional: custom formatting
    formatValue: (value) => String(value).toUpperCase(),
  },
  {
    id: "product",
    name: "Product",
    icon: "📦",
    getValue: (item) => item.product,
  },
  {
    id: "salesperson",
    name: "Salesperson",
    icon: "👤",
    getValue: (item) => item.salesperson,
  },
];

// ============================================================================
// 3. DEFINE MEASURES (what you want to calculate)
// ============================================================================
const measures: MeasureDescriptor<SalesRecord>[] = [
  {
    id: "totalRevenue",
    name: "Total Revenue",
    icon: "💰",
    getValue: (item) => item.revenue,
    aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
    formatValue: (value) => `$${value.toLocaleString()}`,
  },
  {
    id: "totalCost",
    name: "Total Cost",
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
    name: "Quantity Sold",
    icon: "📊",
    getValue: (item) => item.quantity,
    aggregate: (values) => values.reduce((sum, v) => sum + v, 0),
    formatValue: (value) => `${value} units`,
  },
  {
    id: "avgRevenue",
    name: "Avg Revenue",
    icon: "📉",
    getValue: (item) => item.revenue,
    aggregate: (values) =>
      values.length > 0
        ? values.reduce((sum, v) => sum + v, 0) / values.length
        : 0,
    formatValue: (value) => `$${value.toFixed(2)}`,
  },
];

// ============================================================================
// 4. YOUR COMPONENT
// ============================================================================
export function QuickStartCubeExample() {
  // Your data (replace with real data)
  const salesData: SalesRecord[] = [
    {
      id: "1",
      date: "2024-01-15",
      region: "North",
      product: "Laptop",
      salesperson: "Alice",
      quantity: 5,
      revenue: 5000,
      cost: 3500,
    },
    {
      id: "2",
      date: "2024-01-16",
      region: "South",
      product: "Mouse",
      salesperson: "Bob",
      quantity: 20,
      revenue: 500,
      cost: 300,
    },
    // ... more data
  ];

  // State for interactive controls
  const [groupBy, setGroupBy] = useState<string[]>(["region"]);
  const [selectedMeasures, setSelectedMeasures] = useState<string[]>([
    "totalRevenue",
    "profit",
  ]);

  // ============================================================================
  // 5. CREATE CUBE STATE
  // ============================================================================
  const state = useCubeState({
    data: salesData,
    dimensions,
    measures,
    initialGrouping: groupBy, // e.g., ["region"] or ["region", "product"] for multi-level
    activeMeasures: selectedMeasures, // Which measures to show
    initialFilters: [
      // Optional: Add filters
      // { dimensionId: "region", operator: "in", value: ["North", "South"] },
      // { dimensionId: "revenue", operator: "greaterThan", value: 1000 },
    ],
    includeItems: false, // Set true for drill-through capability
    skipEmptyGroups: true,
    maxDepth: 10,
    rawDataDimension: {
      id: "date",
      name: "Date",
      icon: "📅",
      getValue: (item) => item.date,
      formatValue: (value) => {
        const d = new Date(value as string | number | Date);
        return d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      },
    },
  });

  // ============================================================================
  // 7. RENDER
  // ============================================================================
  return (
    <div className="space-y-4 p-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Cube Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Group By Controls */}
          <div className="mb-4">
            <label className="text-sm font-medium mb-2 block">Group By:</label>
            <div className="flex gap-2">
              <Button
                variant={
                  groupBy[0] === "region" && groupBy.length === 1
                    ? "default"
                    : "secondary"
                }
                size="sm"
                onClick={() => setGroupBy(["region"])}
              >
                🌍 Region
              </Button>
              <Button
                variant={
                  groupBy[0] === "product" && groupBy.length === 1
                    ? "default"
                    : "secondary"
                }
                size="sm"
                onClick={() => setGroupBy(["product"])}
              >
                📦 Product
              </Button>
              <Button
                variant={
                  groupBy[0] === "salesperson" && groupBy.length === 1
                    ? "default"
                    : "secondary"
                }
                size="sm"
                onClick={() => setGroupBy(["salesperson"])}
              >
                👤 Salesperson
              </Button>
              <Button
                variant={
                  groupBy[0] === "region" && groupBy[1] === "product"
                    ? "default"
                    : "secondary"
                }
                size="sm"
                onClick={() => setGroupBy(["region", "product"])}
              >
                🌍 Region → 📦 Product
              </Button>
            </div>
          </div>

          {/* Measure Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Show Metrics:
            </label>
            <div className="flex gap-2 flex-wrap">
              {measures.map((measure) => (
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
        </CardContent>
      </Card>

      {/* Results */}
      <CubeView
        state={state}
        maxInitialDepth={1}
        // Optional: Custom rendering
        renderCell={(cell, _group) => {
          if (cell.measureId === "profit") {
            const value = cell.value as number;
            return (
              <div
                className={
                  value >= 0
                    ? "text-green-600 font-semibold"
                    : "text-red-600 font-semibold"
                }
              >
                {cell.formattedValue}
              </div>
            );
          }
          return <div>{cell.formattedValue}</div>;
        }}
      />
    </div>
  );
}

// ============================================================================
// TIPS FOR CUSTOMIZATION
// ============================================================================
/*

1. ADD MORE DIMENSIONS:
   - Just add more entries to the `dimensions` array
   - Each needs: id, name, getValue function

2. ADD MORE MEASURES:
   - Add entries to the `measures` array
   - Define getValue (single item) and aggregate (multiple items)
   - Common aggregates:
     * Sum: values.reduce((sum, v) => sum + v, 0)
     * Average: values.reduce((sum, v) => sum + v, 0) / values.length
     * Count: values.length
     * Min: Math.min(...values)
     * Max: Math.max(...values)

3. ADD FILTERS:
   filters: [
     { dimensionId: "region", operator: "equals", value: "North" },
     { dimensionId: "region", operator: "in", value: ["North", "South"] },
     { dimensionId: "revenue", operator: "greaterThan", value: 1000 },
     { dimensionId: "product", operator: "contains", value: "Pro" },
   ]

4. MULTI-LEVEL GROUPING:
   defaultDimensionSequence: ["region", "product", "salesperson"]
   Creates: Region → Product → Salesperson hierarchy

5. CUSTOM CELL RENDERING:
   renderCell={(cell, group) => {
     // Your custom JSX based on cell.measureId, cell.value, group, etc.
   }}

6. CUSTOM GROUP HEADER:
   renderGroupHeader={(group, level) => {
     // Your custom JSX for group headers
   }}

7. DRILL-DOWN CALLBACKS:
   onDrillDown={(group, newDimensionId) => {
     // Your logic here
   }}

*/
