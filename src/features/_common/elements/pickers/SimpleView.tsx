import {
  AbstractEntityView,
  AbstractEntityViewProps,
} from "@/features/_common/elements/pickers/_common/AbstractEntityView.tsx";
import { SwitchProps } from "@/platform/typescript/SwitchProps.ts";
import { Maybe, rd, RemoteData } from "@passionware/monads";
import React from "react";

export interface SimpleItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** When set, shown as avatar (e.g. client avatar in iteration option). */
  avatarUrl?: Maybe<string>;
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
        avatarUrl: x.avatarUrl ?? null,
        icon: x.icon,
      }))}
      {...props}
    />
  );
}
