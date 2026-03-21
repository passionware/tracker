import {
  type SimpleEvent,
  useSimpleEventSubscription,
} from "@passionware/simple-event";
import * as React from "react";

const HIGHLIGHT_MS = 2500;

/**
 * Subscribes to `scrollEvent` and scrolls the row with `data-item-id` into view,
 * briefly applying `list-view-row-highlight`.
 */
export function useListViewScrollToRow<TId>(
  scrollEvent: SimpleEvent<TId> | undefined,
): React.RefObject<HTMLTableSectionElement | null> {
  const itemContainerRef = React.useRef<HTMLTableSectionElement | null>(null);

  useSimpleEventSubscription(scrollEvent?.addListener, (id) => {
    if (!itemContainerRef.current) return;
    const rowElement = itemContainerRef.current.querySelector(
      `[data-item-id="${id}"]`,
    ) as HTMLElement | null;
    if (rowElement && typeof rowElement.scrollIntoView === "function") {
      rowElement.classList.add("list-view-row-highlight");
      rowElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      setTimeout(() => {
        rowElement.classList.remove("list-view-row-highlight");
      }, HIGHLIGHT_MS);
    }
  });

  return itemContainerRef;
}
