import { MouseEvent } from "react";

const focusable =
  'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable], audio[controls], video[controls], summary, [tabindex^="0"], [tabindex^="1"], [tabindex^="2"], [tabindex^="3"], [tabindex^="4"], [tabindex^="5"], [tabindex^="6"], [tabindex^="7"], [tabindex^="8"], [tabindex^="9"]';

export const getFocusableSelector = () => focusable;

export function isFocusable(event: MouseEvent): boolean {
  const target = event.target as HTMLElement;

  return Boolean(target.closest(focusable));
}

export const focusNextFocusable = (thisElement: HTMLElement) => {
  // Define a selector for all focusable elements
  const focusableSelectors = [
    "a[href]",
    "button",
    "textarea",
    "input",
    "select",
    '[tabindex]:not([tabindex="-1"])',
  ];
  const focusableSelector = focusableSelectors.join(", ");

  // Get all focusable elements in the document
  const focusableElements = Array.from(
    document.querySelectorAll<HTMLElement>(focusableSelector),
  ).filter(
    (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"),
  );

  // Find the index of the current element
  const currentIndex = focusableElements.indexOf(thisElement);

  // If the current element is not found or it's the last focusable element, wrap to the first
  const nextIndex = (currentIndex + 1) % focusableElements.length;

  // Focus the next focusable element
  focusableElements[nextIndex]?.focus();
};
