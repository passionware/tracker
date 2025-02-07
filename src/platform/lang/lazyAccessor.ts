type Factory<T extends Record<string, any>> = {
  [K in keyof T]?: () => T[K];
};

/**
 * Creates a lazy accessor object that will call the factory function to get the value of a property when it is accessed for the first time.
 * @param factory - A factory object that maps property names to functions that return the property value.
 * @param errorTemplate - An error message template that will be used when a missing property is accessed.
 */
export function createLazyAccessor<T extends Record<string, unknown>>(
  factory: Factory<T>,
  errorTemplate = "Attempted to access missing property: %s",
): T {
  const cache: Partial<T> = {};

  return new Proxy({} as T, {
    get: (_, field: string) => {
      if (field in cache) return cache[field as keyof T];
      if (field in factory && factory[field as keyof T]) {
        const value = factory[field as keyof T]!();
        cache[field as keyof T] = value;
        return value;
      }
      throw new Error(errorTemplate.replace("%s", field));
    },
  });
}
