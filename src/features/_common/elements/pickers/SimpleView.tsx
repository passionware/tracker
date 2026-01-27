import {
  AbstractEntityView,
  AbstractEntityViewProps,
} from "@/features/_common/elements/pickers/_common/AbstractEntityView.tsx";
import { SwitchProps } from "@/platform/typescript/SwitchProps.ts";
import { rd, RemoteData } from "@passionware/monads";
import React from "react";

export interface SimpleItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export type SimpleViewProps = SwitchProps<
  AbstractEntityViewProps,
  "entity",
  { item: RemoteData<SimpleItem> }
>;

export function SimpleView({ item, ...props }: SimpleViewProps) {
  return (
    <AbstractEntityView
      entity={rd.map(item, (x) => ({
        name: x.label,
        avatarUrl: null,
        icon: x.icon,
      }))}
      {...props}
    />
  );
}
