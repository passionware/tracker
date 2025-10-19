/**
 * Cube Serialization Module
 *
 * Exports all serialization-related functionality for cube configurations
 * and state management.
 */

// Main serialization functions
export {
  serializeCubeConfig,
  deserializeCubeConfig,
  serializeCubeState,
  deserializeCubeState,
  createSerializableCubeConfig,
  validateSerializableCubeConfig,
  defaultFormatFunctions,
  defaultAggregationFunctions,
} from "./CubeSerialization.ts";

// Types
export type {
  SerializableCubeConfig,
  SerializableCubeState,
  SerializableDataItem,
  SerializableDimension,
  SerializableMeasure,
  SerializableFilter,
  SerializableDataField,
  SerializableDataType,
  AggregationFunction,
  FormatFunctionRegistry,
  AggregationFunctionRegistry,
  SerializationOptions,
  DeserializationOptions,
} from "./CubeSerialization.types.ts";

// Utility functions
export {
  convertToDataType,
  getDefaultValue,
  validateDataItem,
  convertDataToSchema,
  createPreAggregatedTimeSchema,
  createPreAggregatedMeasures,
  createPreAggregatedTimeDimensions,
  createTimeTrackingCubeConfig,
  createSampleTimeTrackingData,
} from "./CubeSerialization.utils.ts";
