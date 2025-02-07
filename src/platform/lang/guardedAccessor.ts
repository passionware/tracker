type ProvidedServices<T extends Record<string, unknown>> = {
  [K in keyof T]?: T[K];
};

/**
 * Creates a lazy accessor object that will only resolve the provided services when they are accessed.
 * @param providedServices - An object containing the services that will be accessed.
 * @param errorTemplate - An error message template that will be used when a missing property is accessed.
 */
export function createGuardedAccessor<T extends Record<string, unknown>>(
  providedServices: ProvidedServices<T>,
  errorTemplate = "Attempted to access missing property: %s",
): T {
  return new Proxy(providedServices as T, {
    get: (target, field: string) => {
      if (field in target) {
        return target[field];
      }
      throw new Error(errorTemplate.replace("%s", field));
    },
  });
}
