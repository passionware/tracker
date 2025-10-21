/**
 * Cube Sort Options Utilities
 *
 * Provides common sorting options for dimensions.
 */

import type { DimensionSortOption, SortDirection } from "./CubeService.types";

/**
 * Create common sorting options for a dimension
 */
export const SortOptions = {
  /**
   * Basic string sorting options
   */
  string: (): DimensionSortOption[] => [
    {
      id: "alphabetical",
      label: "Alphabetical",
      comparator: (a, b) => String(a ?? "").localeCompare(String(b ?? "")),
      defaultDirection: "asc",
    },
    {
      id: "reverse-alphabetical",
      label: "Reverse Alphabetical",
      comparator: (a, b) => String(b ?? "").localeCompare(String(a ?? "")),
      defaultDirection: "desc",
    },
    {
      id: "length",
      label: "By Length",
      comparator: (a, b) => String(a ?? "").length - String(b ?? "").length,
      defaultDirection: "asc",
    },
  ],

  /**
   * Date sorting options
   */
  date: (): DimensionSortOption[] => [
    {
      id: "chronological",
      label: "Chronological",
      comparator: (a, b) => {
        const aDate = a instanceof Date ? a : new Date(String(a));
        const bDate = b instanceof Date ? b : new Date(String(b));

        if (isNaN(aDate.getTime()) && isNaN(bDate.getTime())) return 0;
        if (isNaN(aDate.getTime())) return -1;
        if (isNaN(bDate.getTime())) return 1;

        return aDate.getTime() - bDate.getTime();
      },
      defaultDirection: "asc",
    },
    {
      id: "reverse-chronological",
      label: "Reverse Chronological",
      comparator: (a, b) => {
        const aDate = a instanceof Date ? a : new Date(String(a));
        const bDate = b instanceof Date ? b : new Date(String(b));

        if (isNaN(aDate.getTime()) && isNaN(bDate.getTime())) return 0;
        if (isNaN(aDate.getTime())) return 1;
        if (isNaN(bDate.getTime())) return -1;

        return bDate.getTime() - aDate.getTime();
      },
      defaultDirection: "desc",
    },
  ],

  /**
   * Number sorting options
   */
  number: (): DimensionSortOption[] => [
    {
      id: "ascending",
      label: "Ascending",
      comparator: (a, b) => (Number(a) || 0) - (Number(b) || 0),
      defaultDirection: "asc",
    },
    {
      id: "descending",
      label: "Descending",
      comparator: (a, b) => (Number(b) || 0) - (Number(a) || 0),
      defaultDirection: "desc",
    },
    {
      id: "absolute-value",
      label: "By Absolute Value",
      comparator: (a, b) => Math.abs(Number(a) || 0) - Math.abs(Number(b) || 0),
      defaultDirection: "asc",
    },
  ],

  /**
   * Priority sorting options (for business logic)
   */
  priority: (priorityMap: Record<string, number>): DimensionSortOption[] => [
    {
      id: "priority",
      label: "By Priority",
      comparator: (a, b) => {
        const aPriority = priorityMap[String(a)] || 999;
        const bPriority = priorityMap[String(b)] || 999;
        return aPriority - bPriority;
      },
      defaultDirection: "asc",
    },
    {
      id: "reverse-priority",
      label: "Reverse Priority",
      comparator: (a, b) => {
        const aPriority = priorityMap[String(a)] || 999;
        const bPriority = priorityMap[String(b)] || 999;
        return bPriority - aPriority;
      },
      defaultDirection: "desc",
    },
  ],

  /**
   * Custom sorting options
   */
  custom: (
    options: Array<{
      id: string;
      label: string;
      comparator: (a: unknown, b: unknown) => number;
      defaultDirection?: SortDirection;
    }>,
  ): DimensionSortOption[] => options,
};

/**
 * Get the default sort option for a dimension
 */
export function getDefaultSortOption(dimension: {
  sortOptions?: DimensionSortOption[];
}): DimensionSortOption | null {
  if (!dimension.sortOptions || dimension.sortOptions.length === 0) {
    return null;
  }

  return dimension.sortOptions[0];
}

/**
 * Get sort option by ID
 */
export function getSortOptionById(
  dimension: { sortOptions?: DimensionSortOption[] },
  sortOptionId: string,
): DimensionSortOption | null {
  if (!dimension.sortOptions) {
    return null;
  }

  return (
    dimension.sortOptions.find((option) => option.id === sortOptionId) || null
  );
}

/**
 * Create a sort function from sort state
 */
export function createSortFunction(
  dimension: { sortOptions?: DimensionSortOption[] },
  sortState?: { sortOptionId?: string; direction?: SortDirection },
): ((a: unknown, b: unknown) => number) | null {
  if (!dimension.sortOptions || dimension.sortOptions.length === 0) {
    return null;
  }

  // Get the sort option (use first one if none specified)
  const sortOption = sortState?.sortOptionId
    ? getSortOptionById(dimension, sortState.sortOptionId)
    : getDefaultSortOption(dimension);

  if (!sortOption) {
    return null;
  }

  // Get the direction (use sort option default if none specified)
  const direction =
    sortState?.direction || sortOption.defaultDirection || "asc";

  // Return the comparator with direction applied
  return (a, b) => {
    const result = sortOption.comparator(a, b);
    return direction === "desc" ? -result : result;
  };
}
