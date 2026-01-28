import { cn } from "@/lib/utils";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cva, VariantProps } from "class-variance-authority";
import * as React from "react";

const switchVariants = cva(
  "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        normal:
          "focus-visible:ring-ring focus-visible:ring-offset-background data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        danger:
          "focus-visible:ring-destructive focus-visible:ring-offset-background data-[state=checked]:bg-destructive data-[state=unchecked]:bg-destructive/20",
      },
    },
    defaultVariants: {
      variant: "normal",
    },
  },
);

const thumbClass = cva(
  "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
  {
    variants: {
      variant: {
        normal:
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        danger:
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
      },
    },
    defaultVariants: {
      variant: "normal",
    },
  },
);

type SwitchProps = React.ComponentPropsWithoutRef<
  typeof SwitchPrimitives.Root
> &
  VariantProps<typeof switchVariants>;

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, variant, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(switchVariants({ variant }), className)}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb className={cn(thumbClass({ variant }))} />
  </SwitchPrimitives.Root>
));

Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
