/**
 * Sorting Selector Component
 *
 * A React component that allows users to select sorting options for dimensions.
 * This would be integrated into the cube UI next to the "Break down by" selector.
 */

import React from "react";
import type { DimensionSortOption, SortDirection } from "../CubeService.types";

interface SortingSelectorProps {
  /** Available sorting options for the dimension */
  sortOptions: DimensionSortOption[];
  /** Currently selected sort option ID */
  selectedSortOptionId?: string;
  /** Current sort direction */
  direction?: SortDirection;
  /** Callback when sort option changes */
  onSortOptionChange: (sortOptionId: string) => void;
  /** Callback when direction changes */
  onDirectionChange: (direction: SortDirection) => void;
  /** Optional label for the selector */
  label?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

export function SortingSelector({
  sortOptions,
  selectedSortOptionId,
  direction,
  onSortOptionChange,
  onDirectionChange,
  label = "Sort by:",
  disabled = false,
}: SortingSelectorProps) {
  if (sortOptions.length === 0) {
    return null;
  }

  const currentSortOption =
    sortOptions.find((option) => option.id === selectedSortOptionId) ||
    sortOptions[0];
  const currentDirection =
    direction || currentSortOption.defaultDirection || "asc";

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-600">{label}</span>

      {/* Sort Option Selector */}
      <select
        value={selectedSortOptionId || sortOptions[0].id}
        onChange={(e) => onSortOptionChange(e.target.value)}
        disabled={disabled}
        className="px-2 py-1 border border-gray-300 rounded text-sm bg-white"
      >
        {sortOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Direction Toggle */}
      <button
        onClick={() =>
          onDirectionChange(currentDirection === "asc" ? "desc" : "asc")
        }
        disabled={disabled}
        className="px-2 py-1 border border-gray-300 rounded text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
        title={`Sort ${currentDirection === "asc" ? "descending" : "ascending"}`}
      >
        {currentDirection === "asc" ? "↑" : "↓"}
      </button>
    </div>
  );
}

/**
 * Example usage in a cube UI component
 */
export function CubeUIWithSorting() {
  const [nodeStates, setNodeStates] = React.useState(new Map<string, any>());

  // Example dimensions with sort options
  const dimensions = [
    {
      id: "name",
      name: "Project Name",
      sortOptions: [
        {
          id: "alphabetical",
          label: "Alphabetical",
          comparator: (a: unknown, b: unknown) =>
            String(a).localeCompare(String(b)),
          defaultDirection: "asc" as const,
        },
        {
          id: "length",
          label: "By Length",
          comparator: (a: unknown, b: unknown) =>
            String(a).length - String(b).length,
          defaultDirection: "asc" as const,
        },
      ],
    },
    {
      id: "amount",
      name: "Amount",
      sortOptions: [
        {
          id: "ascending",
          label: "Ascending",
          comparator: (a: unknown, b: unknown) => Number(a) - Number(b),
          defaultDirection: "asc" as const,
        },
        {
          id: "descending",
          label: "Descending",
          comparator: (a: unknown, b: unknown) => Number(b) - Number(a),
          defaultDirection: "desc" as const,
        },
      ],
    },
  ];

  const handleSortChange = (
    nodePath: string,
    sortOptionId: string,
    direction: SortDirection,
  ) => {
    const newNodeStates = new Map(nodeStates);
    const currentState = newNodeStates.get(nodePath) || { isExpanded: false };

    newNodeStates.set(nodePath, {
      ...currentState,
      sortState: { sortOptionId, direction },
    });

    setNodeStates(newNodeStates);
  };

  return (
    <div className="space-y-4">
      {/* Example for each dimension */}
      {dimensions.map((dimension) => (
        <div key={dimension.id} className="p-4 border rounded">
          <h3 className="font-medium mb-2">{dimension.name}</h3>
          <SortingSelector
            sortOptions={dimension.sortOptions}
            selectedSortOptionId={
              nodeStates.get(`${dimension.id}:`)?.sortState?.sortOptionId
            }
            direction={nodeStates.get(`${dimension.id}:`)?.sortState?.direction}
            onSortOptionChange={(sortOptionId) =>
              handleSortChange(`${dimension.id}:`, sortOptionId, "asc")
            }
            onDirectionChange={(direction) =>
              handleSortChange(
                `${dimension.id}:`,
                nodeStates.get(`${dimension.id}:`)?.sortState?.sortOptionId ||
                  dimension.sortOptions[0].id,
                direction,
              )
            }
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Integration with existing cube UI
 */
export function CubeViewWithSorting({
  cube,
  onNodeStateChange,
}: {
  cube: any;
  onNodeStateChange: (nodeStates: Map<string, any>) => void;
}) {
  const [nodeStates, setNodeStates] = React.useState(
    cube.config.nodeStates || new Map<string, any>(),
  );

  const handleSortChange = (
    nodePath: string,
    sortOptionId: string,
    direction: SortDirection,
  ) => {
    const newNodeStates = new Map<string, any>(nodeStates);
    const currentState = newNodeStates.get(nodePath) || { isExpanded: false };

    newNodeStates.set(nodePath, {
      ...currentState,
      sortState: { sortOptionId, direction },
    });

    setNodeStates(newNodeStates);
    onNodeStateChange(newNodeStates);
  };

  return (
    <div className="cube-view">
      {/* Existing cube content */}
      <div className="cube-content">
        {/* Your existing cube rendering logic */}
      </div>

      {/* Sorting controls for each group */}
      {cube.groups.map((group: any) => {
        const dimension = cube.config.dimensions.find(
          (d: any) => d.id === group.dimensionId,
        );
        if (!dimension?.sortOptions) return null;

        return (
          <div key={group.path} className="group-sorting-controls">
            <SortingSelector
              sortOptions={dimension.sortOptions}
              selectedSortOptionId={
                nodeStates.get(group.path)?.sortState?.sortOptionId
              }
              direction={nodeStates.get(group.path)?.sortState?.direction}
              onSortOptionChange={(sortOptionId) =>
                handleSortChange(group.path, sortOptionId, "asc")
              }
              onDirectionChange={(direction) =>
                handleSortChange(
                  group.path,
                  nodeStates.get(group.path)?.sortState?.sortOptionId ||
                    dimension.sortOptions[0].id,
                  direction,
                )
              }
              label={`Sort ${group.dimensionLabel}:`}
            />
          </div>
        );
      })}
    </div>
  );
}
