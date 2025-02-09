import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const buttonVariants = cva(
  "cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-white transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300",
  {
    variants: {
      visuallyDisabled: {
        true: "opacity-50 cursor-not-allowed",
        false: "",
      },
      variant: {
        headless: "",
        default:
          "bg-slate-900 text-slate-50 hover:bg-slate-900/90 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50/90",
        destructive:
          "bg-red-500 text-slate-50 hover:bg-red-500/90 dark:bg-red-900 dark:text-slate-50 dark:hover:bg-red-900/90",
        "outline-destructive":
          "border border-red-500 text-red-500 hover:bg-red-500/20 dark:border-red-900 dark:text-red-900 dark:hover:bg-red-900/90",
        warning:
          "bg-yellow-600 text-slate-50 hover:bg-yellow-500/90 dark:bg-yellow-900 dark:text-slate-50 dark:hover:bg-yellow-900/90",
        outline:
          "border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50",
        secondary:
          "border border-slate-300 bg-slate-100 text-slate-900 hover:bg-slate-100/80 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-800/80",
        ghost:
          "xhover:bg-slate-100 xhover:text-slate-900 dark:xhover:bg-slate-800 dark:xhover:text-slate-50",
        link: "text-slate-900 underline-offset-4 hover:underline dark:text-slate-50",
        // some gold-purple gradient tl-br
        accent1: [
          "border border-black/70 text-white",
          "bg-linear-to-br from-yellow-600 via-orange-800 to-purple-800  hover:brightness-110 dark:from-yellow-500 dark:to-purple-500 dark:hover:from-yellow-600 dark:hover:to-purple-600",
        ],
        accent2: [
          "border border-black/70 text-white",
          // gold-emerald
          "bg-linear-to-br from-yellow-600  to-emerald-900  hover:brightness-110 dark:from-yellow-500 dark:to-emerald-500 dark:hover:from-yellow-600 dark:hover:to-emerald-600",
        ],
      },
      size: {
        headless: "rounded-full",
        default: "text-sm h-10 rounded-md px-4 py-2",
        sm: "text-sm h-9 rounded-md px-3",
        xs: "text-xs h-6 rounded px-2",
        lg: "text-sm h-11 rounded-md px-4",
        icon: "text-sm h-10 rounded-md  w-10",
        "icon-xs": "text-xs h-6 rounded-md w-6",
        "icon-sm": "text-sm h-9 rounded-md w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  visuallyDisabled?: boolean;
  onDisabledClick?: (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => void;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      type = "button",
      variant,
      size,
      visuallyDisabled,
      onDisabledClick,
      onClick,
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        type={type}
        className={cn(
          buttonVariants({ variant, size, visuallyDisabled, className }),
        )}
        aria-disabled={props.disabled || visuallyDisabled}
        onClick={(e) => {
          if (onDisabledClick && (props.disabled || visuallyDisabled)) {
            onDisabledClick(e);
          }
          if (props.disabled || visuallyDisabled) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          onClick?.(e);
        }}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
