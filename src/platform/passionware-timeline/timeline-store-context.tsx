"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { TimelineJotaiBundle } from "./timeline-jotai-atoms.ts";

const TimelineStoreContext = createContext<TimelineJotaiBundle<
  unknown,
  unknown
> | null>(null);

export function TimelineStoreProvider<
  Data = unknown,
  TLaneMeta = unknown,
>({
  bundle,
  children,
}: {
  bundle: TimelineJotaiBundle<Data, TLaneMeta>;
  children: ReactNode;
}) {
  return (
    <TimelineStoreContext.Provider
      value={bundle as TimelineJotaiBundle<unknown, unknown>}
    >
      {children}
    </TimelineStoreContext.Provider>
  );
}

export function useTimelineStore<
  Data = unknown,
  TLaneMeta = unknown,
>(): TimelineJotaiBundle<Data, TLaneMeta> {
  const ctx = useContext(TimelineStoreContext);
  if (!ctx) {
    throw new Error("useTimelineStore must be used under TimelineStoreProvider");
  }
  return ctx as TimelineJotaiBundle<Data, TLaneMeta>;
}
