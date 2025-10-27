/**
 * Serialized Cube View Component
 *
 * A wrapper around CubeView that automatically handles ListView rendering for raw data
 * using the serialized listView configuration.
 */

import { rd } from "@passionware/monads";
import { CubeView } from "./CubeView";
import { ListView } from "@/features/_common/ListView";
import type { CubeState } from "./useCubeState";
import type { SerializableCubeConfig } from "./serialization/CubeSerialization.types";
import { defaultFormatFunctions } from "./serialization/CubeSerialization";

export interface SerializedCubeViewProps {
  /** Cube state from useCubeState hook */
  state: CubeState;
  /** Serialized cube configuration containing listView setup */
  serializedConfig: SerializableCubeConfig;
  /** Optional: Custom class name */
  className?: string;
  /** Optional: Maximum initial expansion depth */
  maxInitialDepth?: number;
  /** Optional: Enable zoom-in feature */
  enableZoomIn?: boolean;
}

/**
 * SerializedCubeView component
 *
 * A wrapper around CubeView that automatically renders raw data using ListView
 * based on the serialized configuration's listView setup.
 */
export function SerializedCubeView({
  state,
  serializedConfig,
  className,
  maxInitialDepth = 0,
  enableZoomIn = true,
}: SerializedCubeViewProps) {
  return (
    <CubeView
      state={state}
      className={className}
      maxInitialDepth={maxInitialDepth}
      enableZoomIn={enableZoomIn}
      renderRawData={(items) => {
        if (!serializedConfig.listView?.columns) {
          return (
            <div className="p-4 text-center text-slate-500">
              <p>No ListView configuration available</p>
              <p className="text-sm mt-2">
                Add listView.columns to the serialized config
              </p>
            </div>
          );
        }

        // Create a lookup map for dimension label mappings
        const labelMappings: Record<string, Record<string, string>> = {};
        serializedConfig.dimensions.forEach((dim) => {
          if (dim.labelMapping) {
            labelMappings[dim.fieldName] = dim.labelMapping;
          }
        });

        // Convert serialized columns to TanStack Table columns
        const columns = serializedConfig.listView.columns.map((col) => ({
          id: col.id,
          header: col.name,
          accessorKey: col.fieldName,
          cell: ({ getValue }: { getValue: () => any }) => {
            const value = getValue();

            // Check if we have a label mapping for this field
            const labelMapping = labelMappings[col.fieldName];
            if (labelMapping && value !== undefined && value !== null) {
              const mappedValue = labelMapping[String(value)];
              if (mappedValue) {
                return mappedValue;
              }
            }

            // Apply format function if available
            if (col.formatFunction) {
              const formatter = defaultFormatFunctions[col.formatFunction.type];
              if (formatter) {
                return formatter.format(value, col.formatFunction.parameters);
              }
            }

            return String(value);
          },
          meta: {
            tooltip: col.description,
            sortKey: col.sortable ? col.fieldName : undefined,
          },
        }));

        // Create query for ListView
        const query = {
          sort: [] as any[],
          page: 1,
          limit: serializedConfig.listView.maxInitialItems || 50,
        };

        return (
          <div className="h-full">
            <ListView
              data={rd.of(items)}
              columns={columns}
              query={query as any}
              onQueryChange={() => {}}
              caption={`Raw data view with ${items.length} items`}
            />
          </div>
        );
      }}
    />
  );
}
