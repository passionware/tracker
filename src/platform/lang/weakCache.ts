export function createWeakCache<T, R>(factory: (key: T) => R) {
  // Use WeakMap for object keys, regular Map for primitive keys
  const isObjectKey = (key: T): key is T & object =>
    typeof key === "object" && key !== null;

  const weakCache = new WeakMap<T & object, R>();
  const mapCache = new Map<T, R>();

  return {
    getOrCreate: (key: T): R => {
      if (isObjectKey(key)) {
        if (!weakCache.has(key)) {
          weakCache.set(key, factory(key));
        }
        return weakCache.get(key)!;
      } else {
        if (!mapCache.has(key)) {
          mapCache.set(key, factory(key));
        }
        return mapCache.get(key)!;
      }
    },
  };
}
