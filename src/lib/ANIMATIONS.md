# Animation System Documentation

This document describes the standardized animation system used across all UI components in the application.

## Overview

The animation system provides consistent, accessible, and performant transitions for all interactive elements including dialogs, popovers, menus, tooltips, and sheets.

## Core Principles

1. **Consistency** - All similar components use the same animation patterns
2. **Accessibility** - Animations respect user preferences and don't cause motion sickness
3. **Performance** - Uses CSS transforms and opacity for smooth 60fps animations
4. **Semantic** - Animation direction matches user expectations

## Animation Types

### Fade Animations

- **fadeIn**: `animate-in fade-in-0` - Smooth opacity transition in
- **fadeOut**: `animate-out fade-out-0` - Smooth opacity transition out

### Zoom Animations

- **zoomIn**: `animate-in zoom-in-95` - Subtle scale up effect
- **zoomOut**: `animate-out zoom-out-95` - Subtle scale down effect

### Slide Animations

- **slideInFromTop**: `animate-in slide-in-from-top-2` - Slides down from above
- **slideInFromBottom**: `animate-in slide-in-from-bottom-2` - Slides up from below
- **slideInFromLeft**: `animate-in slide-in-from-left-2` - Slides in from left
- **slideInFromRight**: `animate-in slide-in-from-right-2` - Slides in from right

## Component-Specific Animations

### Dialogs & Modals

```typescript
contentAnimations.dialog;
```

- Fade in/out with zoom effect
- Slide from center with slight offset
- 200ms duration for responsive feel

### Popovers

```typescript
contentAnimations.popover;
```

- Fade in/out with zoom effect
- Directional slide based on placement
- 200ms duration

### Dropdown Menus

```typescript
contentAnimations.dropdown;
```

- Same as popovers for consistency
- Optimized for quick interactions

### Tooltips

```typescript
contentAnimations.tooltip;
```

- Subtle fade and zoom
- Directional slide based on placement
- 200ms duration

### Sheets (Side Panels)

```typescript
contentAnimations.sheet;
contentAnimations.sheetTop;
contentAnimations.sheetBottom;
contentAnimations.sheetLeft;
contentAnimations.sheetRight;
```

- Slide animations based on side
- Different durations for open (500ms) vs close (300ms)
- Smooth easing for natural feel

## Usage Examples

### Basic Component Animation

```typescript
import { contentAnimations } from "@/lib/animations";

// In your component
<PopoverContent className={cn(
  "your-base-classes",
  contentAnimations.popover,
  className
)}>
```

### Custom Animation Preset

```typescript
import { getAnimationClasses } from "@/lib/animations";

// Get preset animations
const classes = getAnimationClasses("modal", "custom-class");
```

### Conditional Animations

```typescript
import { getConditionalAnimation } from "@/lib/animations";

const animationClasses = getConditionalAnimation(
  isOpen,
  "animate-in fade-in-0",
  "animate-out fade-out-0",
);
```

## Transition Classes

### Interactive Elements

- **button**: `transition-all duration-200 ease-in-out`
- **input**: `transition-colors duration-200 ease-in-out`
- **card**: `transition-all duration-200 ease-in-out`

### Hover States

- **hover**: `transition-colors duration-150 ease-in-out`
- **focus**: `transition-all duration-150 ease-in-out`

### Transform Effects

- **scale**: `transition-transform duration-200 ease-in-out`
- **opacity**: `transition-opacity duration-200 ease-in-out`

## Duration Standards

- **Fast**: 150ms - For hover states and quick feedback
- **Normal**: 200ms - For most UI transitions
- **Slow**: 300ms - For complex animations
- **Slower**: 500ms - For sheet open animations

## Easing Functions

- **easeInOut**: `ease-in-out` - Natural, balanced feel
- **easeOut**: `ease-out` - Quick start, slow finish
- **easeIn**: `ease-in` - Slow start, quick finish
- **linear**: `linear` - Constant speed

## Accessibility Considerations

1. **Respects `prefers-reduced-motion`** - Users can disable animations
2. **No motion sickness triggers** - Avoids rapid or jarring movements
3. **Logical direction** - Animations follow user expectations
4. **Appropriate duration** - Not too fast or slow

## Performance Best Practices

1. **Use CSS transforms** - GPU accelerated, smooth performance
2. **Avoid layout thrashing** - Use transform and opacity
3. **Consistent timing** - Reduces visual jarring
4. **Hardware acceleration** - Transform3d for better performance

## Migration Guide

### Before (Inline animations)

```typescript
className =
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";
```

### After (Standardized)

```typescript
className={cn("base-classes", contentAnimations.popover)}
```

## Future Enhancements

- [ ] Spring physics animations
- [ ] Gesture-based animations
- [ ] Theme-aware animation timing
- [ ] Advanced easing curves
- [ ] Animation orchestration utilities
