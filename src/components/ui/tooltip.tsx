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
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 rounded-md border border-slate-500/90 bg-slate-950/70 backdrop-blur-sm  px-3 py-1.5 text-sm text-slate-50 shadow shadow-black/30 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50",
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

export type SimpleTooltipProps = TooltipProps & {
  title: ReactNode;
};

export function SimpleTooltip({
  children,
  open,
  title,
  delayDuration = 1000,
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
        <TooltipContent className="max-w-96">{title}</TooltipContent>
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
      <Slot ref={triggerRef}>{children}</Slot>
    </SimpleTooltip>
  );
}
