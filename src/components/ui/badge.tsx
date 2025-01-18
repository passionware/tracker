import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex whitespace-pre items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 dark:focus:ring-slate-300",
  {
    variants: {
      tone: {
        solid: "",
        outline: "",
        secondary: "",
      },
      variant: {
        primary: "",
        secondary: "",
        positive: "",
        destructive: "",
        warning: "",
      },
      size: {
        md: "px-2.5 py-0.5 text-xs font-semibold",
        sm: "px-1 py-[0.0125rem] text-[8pt] font-regular",
      },
    },
    compoundVariants: [
      {
        tone: "solid",
        variant: "primary",
        class:
          "bg-slate-900 text-slate-50 hover:bg-slate-900/80 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50/80",
      },
      {
        tone: "solid",
        variant: "secondary",
        class:
          "bg-slate-100 text-slate-900 hover:bg-slate-100/80 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-800/80",
      },
      {
        tone: "solid",
        variant: "positive",
        class:
          "border-green-700 bg-green-600 text-white/95 hover:bg-green-500/80 dark:bg-green-900 dark:text-slate-50 dark:hover:bg-green-900/80",
      },
      {
        tone: "solid",
        variant: "destructive",
        class:
          "border-red-700 bg-red-600 text-white/95 hover:bg-red-500/80 dark:bg-red-900 dark:text-slate-50 dark:hover:bg-red-900/80",
      },
      {
        tone: "solid",
        variant: "warning",
        class:
          "border-yellow-700 bg-yellow-600 text-white/95 hover:bg-yellow-500/80 dark:bg-yellow-900 dark:text-slate-50 dark:hover:bg-yellow-900/80",
      },
      {
        tone: "outline",
        variant: "primary",
        class:
          "border-slate-900 bg-white text-slate-900 dark:border-slate-50 dark:bg-slate-900 dark:text-slate-50",
      },
      {
        tone: "outline",
        variant: "secondary",
        class:
          "border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50",
      },
      {
        tone: "outline",
        variant: "positive",
        class:
          "border-green-800 bg-white text-green-800 dark:border-green-400 dark:bg-slate-900 dark:text-green-400",
      },
      {
        tone: "outline",
        variant: "destructive",
        class:
          "border-red-800 bg-white text-red-800 dark:border-red-400 dark:bg-slate-900 dark:text-red-400",
      },
      {
        tone: "outline",
        variant: "warning",
        class:
          "border-yellow-800 bg-white text-yellow-800 dark:border-yellow-400 dark:bg-slate-900 dark:text-yellow-400",
      },
      {
        tone: "secondary",
        variant: "primary",
        class:
          "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-800/80",
      },
      {
        tone: "secondary",
        variant: "secondary",
        class:
          "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-800/80",
      },
      {
        tone: "secondary",
        variant: "positive",
        class:
          "border-slate-950/20 bg-green-100 text-green-700 hover:bg-green-100/80 dark:bg-green-800 dark:text-green-300 dark:hover:bg-green-800/80",
      },
      {
        tone: "secondary",
        variant: "destructive",
        class:
          "border-slate-950/20 bg-red-100 text-red-700 hover:bg-red-100/80 dark:bg-red-800 dark:text-red-300 dark:hover:bg-red-800/80",
      },
      {
        tone: "secondary",
        variant: "warning",
        class:
          "border-slate-950/20 bg-yellow-100 text-yellow-700 hover:bg-yellow-100/80 dark:bg-yellow-800 dark:text-yellow-300 dark:hover:bg-yellow-800/80",
      },
    ],
    defaultVariants: {
      tone: "solid",
      variant: "primary",
      size: "md",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, tone, variant, size, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ tone, variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
