import type { EntityStackItem } from "./descriptors";
import type { DrawerContext } from "./drawerTypes";
import type { DrawerDescriptorServices } from "./DrawerDescriptor";
import { createContext, type ReactNode, useContext, useMemo } from "react";

export type EntityDrawerContextValue = {
  context: DrawerContext;
  services: DrawerDescriptorServices;
  entityStack: EntityStackItem[];
  pushEntityDrawer: (entity: EntityStackItem) => void;
  popEntityDrawer: () => void;
  openEntityDrawer: (entity: EntityStackItem) => void;
  closeEntityDrawer: () => void;
  jumpToEntityStackIndex: (index: number) => void;
};

const EntityDrawerContext = createContext<EntityDrawerContextValue | null>(
  null,
);

export function EntityDrawerProvider({
  value,
  children,
}: {
  value: EntityDrawerContextValue;
  children: ReactNode;
}) {
  const memoValue = useMemo(() => value, [value]);
  return (
    <EntityDrawerContext.Provider value={memoValue}>
      {children}
    </EntityDrawerContext.Provider>
  );
}

export function useEntityDrawerContext(): EntityDrawerContextValue {
  const ctx = useContext(EntityDrawerContext);
  if (ctx == null) {
    throw new Error(
      "useEntityDrawerContext must be used within EntityDrawerProvider",
    );
  }
  return ctx;
}
