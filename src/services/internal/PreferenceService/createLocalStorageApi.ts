import { Maybe } from "@passionware/monads";

export interface ReadWriteApi<T> {
  read(): Promise<Maybe<T>>;
  write(value: T): Promise<void>;
}

export function createLocalStorageApi<T>(
  key: string,
  parse: (data: unknown) => T,
  defaultValue: T,
): ReadWriteApi<T> {
  return {
    async read(): Promise<Maybe<T>> {
      if (typeof window === "undefined" || !window.localStorage) {
        return defaultValue;
      }
      try {
        const stored = window.localStorage.getItem(key);
        if (!stored) {
          return defaultValue;
        }
        return parse(JSON.parse(stored));
      } catch {
        return defaultValue;
      }
    },
    async write(value: T): Promise<void> {
      if (typeof window === "undefined" || !window.localStorage) {
        return;
      }
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Error storing preference ${key}:`, error);
      }
    },
  };
}
