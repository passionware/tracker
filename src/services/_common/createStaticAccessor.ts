export function createStaticAccessor<T>(data: T) {
  return {
    use: () => data,
    get: () => data,
  };
}
