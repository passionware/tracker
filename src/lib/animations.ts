import { cn } from "@/lib/utils";

/**
 * Standard animation utilities for consistent transitions across the app
 */

// Base animation classes that all components should use
export const animationClasses = {
  // Fade animations
  fadeIn: "animate-in fade-in-0",
  fadeOut: "animate-out fade-out-0",

  // Zoom animations
  zoomIn: "animate-in zoom-in-95",
  zoomOut: "animate-out zoom-out-95",

  // Slide animations
  slideInFromTop: "animate-in slide-in-from-top-2",
  slideInFromBottom: "animate-in slide-in-from-bottom-2",
  slideInFromLeft: "animate-in slide-in-from-left-2",
  slideInFromRight: "animate-in slide-in-from-right-2",

  slideOutToTop: "animate-out slide-out-to-top-2",
  slideOutToBottom: "animate-out slide-out-to-bottom-2",
  slideOutToLeft: "animate-out slide-out-to-left-2",
  slideOutToRight: "animate-out slide-out-to-right-2",

  // Scale animations
  scaleIn: "animate-in zoom-in-95",
  scaleOut: "animate-out zoom-out-95",

  // Duration classes
  durationFast: "duration-150",
  durationNormal: "duration-200",
  durationSlow: "duration-300",
  durationSlower: "duration-500",
} as const;

// Standard overlay animations
export const overlayAnimations = {
  backdrop: cn(
    "fixed inset-0 z-50 bg-black/80",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  ),
} as const;

// Standard content animations for different component types
export const contentAnimations = {
  // Dialog/Modal content
  dialog: cn(
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
    "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
    "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
    "duration-200",
  ),

  // Popover content
  popover: cn(
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
    "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
    "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
    "duration-200",
  ),

  // Dropdown menu content
  dropdown: cn(
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
    "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
    "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
    "duration-200",
  ),

  // Tooltip content
  tooltip: cn(
    "animate-in fade-in-0 zoom-in-95",
    "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
    "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
    "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
    "duration-200",
  ),

  // Sheet content (side panels)
  sheet: cn(
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:duration-300 data-[state=open]:duration-500",
    "transition ease-in-out",
  ),

  // Sheet variants for different sides
  sheetTop: cn(
    "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
  ),
  sheetBottom: cn(
    "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
  ),
  sheetLeft: cn(
    "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
  ),
  sheetRight: cn(
    "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
  ),
} as const;

// Standard transition classes for interactive elements
export const transitionClasses = {
  // Button transitions
  button: "transition-all duration-200 ease-in-out",

  // Input transitions
  input: "transition-colors duration-200 ease-in-out",

  // Card transitions
  card: "transition-all duration-200 ease-in-out",

  // Hover transitions
  hover: "transition-colors duration-150 ease-in-out",

  // Focus transitions
  focus: "transition-all duration-150 ease-in-out",

  // Scale transitions
  scale: "transition-transform duration-200 ease-in-out",

  // Opacity transitions
  opacity: "transition-opacity duration-200 ease-in-out",
} as const;

// Animation presets for common use cases
export const animationPresets = {
  // Modal/Dialog preset
  modal: {
    overlay: overlayAnimations.backdrop,
    content: contentAnimations.dialog,
  },

  // Popover preset
  popover: {
    content: contentAnimations.popover,
  },

  // Dropdown preset
  dropdown: {
    content: contentAnimations.dropdown,
  },

  // Tooltip preset
  tooltip: {
    content: contentAnimations.tooltip,
  },

  // Sheet preset
  sheet: {
    overlay: overlayAnimations.backdrop,
    content: contentAnimations.sheet,
  },
} as const;

// Utility function to combine animation classes
export function getAnimationClasses(
  type: keyof typeof animationPresets,
  customClasses?: string,
) {
  const preset = animationPresets[type];
  return cn(
    preset.content,
    "overlay" in preset ? preset.overlay : undefined,
    customClasses,
  );
}

// Utility function for conditional animations
export function getConditionalAnimation(
  isOpen: boolean,
  openClasses: string,
  closedClasses: string = "",
) {
  return isOpen ? openClasses : closedClasses;
}

// Standard easing functions
export const easing = {
  easeInOut: "ease-in-out",
  easeOut: "ease-out",
  easeIn: "ease-in",
  linear: "linear",
} as const;

// Standard durations
export const durations = {
  fast: "150ms",
  normal: "200ms",
  slow: "300ms",
  slower: "500ms",
} as const;
