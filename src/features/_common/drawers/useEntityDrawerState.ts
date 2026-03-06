import { ReactNode, useCallback, useState } from "react";

export type EntityDrawerTarget =
  | { type: "report"; id: number }
  | { type: "cost"; id: number }
  | { type: "billing"; id: number };

export interface EntityDrawerNode {
  key: string;
  label: string;
  title: string;
  renderMainInfo?: () => ReactNode;
  render: () => ReactNode;
  entity?: EntityDrawerTarget;
}

export function useEntityDrawerState() {
  const [entityStack, setEntityStack] = useState<EntityDrawerNode[]>([]);

  const activeEntity =
    entityStack.length > 0 ? entityStack[entityStack.length - 1] : null;

  const openEntityDrawer = useCallback((node: EntityDrawerNode) => {
    setEntityStack([node]);
  }, []);

  const pushEntityDrawer = useCallback((node: EntityDrawerNode) => {
    setEntityStack((current) => {
      const top = current[current.length - 1];
      if (!top) {
        return [node];
      }
      if (top.key === node.key) {
        return current;
      }
      if (
        top.entity &&
        node.entity &&
        top.entity.type === node.entity.type &&
        top.entity.id === node.entity.id
      ) {
        return current;
      }
      return [...current, node];
    });
  }, []);

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
