import { useCallback, useState } from "react";
import type { EntityStackItem } from "./descriptors";

export interface UseEntityDrawerStateOptions<T> {
  /** Return a stable key for dedup when pushing the same entity. */
  getKey?: (entity: T) => string;
}

export function useEntityDrawerState<T = EntityStackItem>(
  options?: UseEntityDrawerStateOptions<T>,
) {
  const [entityStack, setEntityStack] = useState<T[]>([]);
  const getKey = options?.getKey;

  const activeEntity =
    entityStack.length > 0 ? entityStack[entityStack.length - 1] : null;

  const openEntityDrawer = useCallback((entity: T) => {
    setEntityStack([entity]);
  }, []);

  const pushEntityDrawer = useCallback(
    (entity: T) => {
      setEntityStack((current) => {
        const top = current[current.length - 1];
        if (!top) {
          return [entity];
        }
        if (getKey && getKey(top) === getKey(entity)) {
          return current;
        }
        return [...current, entity];
      });
    },
    [getKey],
  );

  const jumpToEntityStackIndex = useCallback((index: number) => {
    setEntityStack((current) => current.slice(0, index + 1));
  }, []);

  const popEntityDrawer = useCallback(() => {
    setEntityStack((current) => current.slice(0, -1));
  }, []);

  const closeEntityDrawer = useCallback(() => {
    setEntityStack([]);
  }, []);

  return {
    entityStack,
    activeEntity,
    openEntityDrawer,
    pushEntityDrawer,
    jumpToEntityStackIndex,
    popEntityDrawer,
    closeEntityDrawer,
    setEntityStack,
  };
}
