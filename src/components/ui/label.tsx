import { cn } from "@/lib/utils";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      size: {
        default: "text-sm", // Domyślna wielkość
        lg: "text-lg", // Nowy wariant
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

const Label = (
  props: React.ComponentPropsWithRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>,
) => {
  const { className, size, ...rest } = props;
  return (
    <LabelPrimitive.Root
      className={cn(labelVariants({ size }), className)}
      {...rest}
    />
  );
};

export { Label };
