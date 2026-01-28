import { contentAnimations } from "@/lib/animations";
import { cn } from "@/lib/utils";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";

const Popover = (props: React.ComponentProps<typeof PopoverPrimitive.Root>) => (
  <PopoverPrimitive.Root modal={true} {...props} />
);

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "w-72 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md outline-hidden",
        "max-h-[calc(var(--radix-popover-content-available-height)-2rem)] overflow-y-auto",
        "max-w-[calc(var(--radix-popover-content-available-width)-2rem)] overflow-x-auto",
        contentAnimations.popover,
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

function PopoverHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("text-lg text-popover-foreground pb-4 font-light ", className)}>
      {children}
    </div>
  );
}

export { Popover, PopoverTrigger, PopoverContent, PopoverHeader };
