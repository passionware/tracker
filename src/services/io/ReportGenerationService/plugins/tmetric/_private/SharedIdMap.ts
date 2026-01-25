import { Maybe, maybe } from "@passionware/monads";

/**
 * Shared ID map for mapping display names to short sequential IDs.
 * Can be used for activities, projects, tasks, or any other entities that need
 * consistent ID mapping across multiple contractors or contexts.
 * Maps display names (e.g., "Development", "Code Review", "Project Name") to short sequential IDs (e.g., "a1", "a2", "p1").
 */
export class SharedIdMap {
  private valueToKey = new Map<string, string>();
  private counter = 1;
  private prefix: string;

  constructor(prefix: string = "a") {
    this.prefix = prefix;
  }

  /**
   * Get the key (ID) for a given value (display name).
   * Returns Maybe<string> - present if the value exists, absent if not.
   */
  getKeyForValue(value: string): Maybe<string> {
    const key = this.valueToKey.get(value);
    return maybe.of(key);
  }

  /**
   * Put a new value and generate a new key for it.
   * Returns the generated key.
   */
  putNewValue(value: string): string {
    const existingKey = this.valueToKey.get(value);
    if (existingKey !== undefined) {
      return existingKey;
    }

    const newKey = `${this.prefix}${this.counter++}`;
    this.valueToKey.set(value, newKey);
    return newKey;
  }

  /**
   * Get or create a key for a value.
   * If the value exists, returns the existing key.
   * Otherwise, creates a new key and returns it.
   */
  getOrCreateKey(value: string): string {
    const existing = this.getKeyForValue(value);
    if (maybe.isPresent(existing)) {
      return maybe.getOrThrow(existing);
    }
    return this.putNewValue(value);
  }

  /**
   * Get all entries as a map (for debugging/testing)
   */
  getAllEntries(): Map<string, string> {
    return new Map(this.valueToKey);
  }
}
