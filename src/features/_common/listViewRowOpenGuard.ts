import type { MouseEvent } from "react";

/** Skip row open handlers when the user clicked controls, links, or a portal target outside the row. */
export function shouldSuppressListViewRowOpen(e: MouseEvent): boolean {
  if (e.target instanceof Element) {
    if (e.target.closest("a, button, [data-no-row-open]")) {
      return true;
    }
    if (!e.currentTarget.contains(e.target)) {
      return true;
    }
  }
  return false;
}
