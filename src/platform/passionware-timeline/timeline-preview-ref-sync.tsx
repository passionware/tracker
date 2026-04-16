"use client";

import { useAtomValue } from "jotai";
import { useEffect, useMemo, type RefObject } from "react";
import { snapTimeForOption } from "./timeline-jotai-atoms.ts";
import {
  computeCalculatedPreviewItem,
  type CalculatedDrawPreview,
} from "./timeline-layout-logic.ts";
import { useTimelineStore } from "./timeline-store-context.tsx";

export function TimelinePreviewRefSync({
  previewItemRef,
  screenXToContainerX,
}: {
  previewItemRef: RefObject<CalculatedDrawPreview | null>;
  screenXToContainerX: (screenX: number) => number;
}) {
  const { store, atoms } = useTimelineStore();
  const dragState = useAtomValue(atoms.dragStateAtom, { store });
  const currentMouseX = useAtomValue(atoms.currentMouseXAtom, { store });
  const mergedItems = useAtomValue(atoms.mergedItemsAtom, { store });
  const scrollOffset = useAtomValue(atoms.scrollOffsetAtom, { store });
  const zoom = useAtomValue(atoms.zoomAtom, { store });
  const snapOption = useAtomValue(atoms.snapOptionAtom, { store });
  const laneSidebarWidthPx = useAtomValue(atoms.laneSidebarWidthPxAtom, {
    store,
  });

  const calculated = useMemo(
    () =>
      computeCalculatedPreviewItem(
        dragState,
        currentMouseX,
        mergedItems,
        (t) => snapTimeForOption(snapOption, t),
        scrollOffset,
        zoom,
        screenXToContainerX,
        laneSidebarWidthPx,
      ),
    [
      currentMouseX,
      dragState,
      laneSidebarWidthPx,
      mergedItems,
      screenXToContainerX,
      scrollOffset,
      snapOption,
      zoom,
    ],
  );

  useEffect(() => {
    previewItemRef.current = calculated;
  }, [calculated, previewItemRef]);

  return null;
}
