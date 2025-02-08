/**
 * Creates a lazy accessor object that will only resolve the provided services when they are accessed.
 * @param providedServices - An object containing the services that will be accessed.
 * @param errorTemplate - An error message template that will be used when a missing property is accessed.
 */
export function createGuardedAccessor<T extends object, S extends T>(
  providedServices: Partial<T>,
  errorTemplate = "Attempted to access missing property: %s",
): S {
  return new Proxy(providedServices as S, {
    get: (target, field) => {
      if (field in target) {
        // @ts-expect-error - This is a valid access pattern.
        return target[field];
      }
      if (typeof field !== "string") return undefined;
      if (field === "$$typeof") return undefined;
      if (field === "toJSON") return undefined;
      throw new Error(errorTemplate.replace("%s", String(field)));
    },
  });
}

/**
 * Todo:
 * this has bad devex, since we don't really know which services are required, we discover it lately, maybe even after we deploy storybook etc.
 *
 * Better idea: create some reusable "slices" of service.
 * const services = [
 *     createWorkspaceServiceSlice(/ optionally rename args accessors / ),
 *     createClientServiceSlice(/ optionally rename args accessors / ),
 *     createContractorServiceSlice( / optionally rename args accessors / ),
 * ]
 *
 * const sb = createSbServices(services)
 *
 * const meta = {
 *     decorator: sb.decorator,
 *     args: sb.args,
 *     argTypes: sb.argTypes,
 *     component: MyComponent,
 * }
 */
