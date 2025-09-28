import { contentAnimations } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { Maybe, maybe } from "@passionware/monads";
import { Slot } from "@radix-ui/react-slot";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { TooltipProps } from "@radix-ui/react-tooltip";
import * as React from "react";
import { ReactNode, useEffect, useRef, useState } from "react";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    light?: boolean;
  }
>(({ className, sideOffset = 4, light, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      light
        ? "overflow-hidden rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-950 shadow-md dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
        : "rounded-md border border-slate-500/90 bg-slate-950/70 backdrop-blur-xs px-3 py-1.5 text-sm text-slate-50 shadow-sm shadow-black/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50",
      contentAnimations.tooltip,
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

export type SimpleTooltipProps = TooltipProps & {
  title: ReactNode;
  light?: boolean;
};

export function SimpleTooltip({
  children,
  open,
  title,
  delayDuration = 1000,
  light,
  ...rest
}: SimpleTooltipProps) {
  return (
    <Tooltip
      open={maybe.getOrElse(open, title ? undefined : false)}
      delayDuration={delayDuration}
      {...rest}
    >
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipPrimitive.Portal>
        <TooltipContent light={light} className="max-w-96 break-words">
          {title}
        </TooltipContent>
      </TooltipPrimitive.Portal>
    </Tooltip>
  );
}

export interface SwitchableTooltipProps {
  tooltipChildren: ReactNode;
  children: ReactNode;
  enabled: Maybe<boolean>;
  title: ReactNode;
}

export function SwitchableTooltip({
  tooltipChildren,
  children,
  enabled,
  title,
}: SwitchableTooltipProps) {
  if (enabled) {
    return <SimpleTooltip title={title}>{tooltipChildren}</SimpleTooltip>;
  }
  return <>{children}</>;
}

export function OverflowTooltip({
  children,
  title,
  ...rest
}: SimpleTooltipProps) {
  const triggerRef = useRef<HTMLElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const element = triggerRef.current;
    if (element) {
      const isHorizontalOverflow = element.scrollWidth > element.clientWidth;
      const isVerticalOverflow = element.scrollHeight > element.clientHeight;
      setIsOverflowing(isHorizontalOverflow || isVerticalOverflow);
    }
  }, [children]);

  return (
    <SimpleTooltip
      title={title}
      open={isOverflowing ? undefined : false}
      {...rest}
    >
      <Slot className="cursor-default" ref={triggerRef}>
        {children}
      </Slot>
    </SimpleTooltip>
  );
}
