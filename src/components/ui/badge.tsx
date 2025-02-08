import { RollingText } from "@/features/_common/RollingText.tsx";
import { ComponentPropsWithRef } from "react";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex whitespace-pre items-center rounded-full border transition-colors focus:outline-hidden focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 dark:focus:ring-slate-300",
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
        accent1: "", // violet-red gradient tl-br
        accent2: "", // orange-blue tl-br
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
        tone: "solid",
        variant: "accent1",
        class:
          "border-violet-700 bg-linear-to-br from-violet-500 to-red-500 text-white/95 hover:bg-linear-to-br hover:from-violet-400 hover:to-red-400 dark:bg-linear-to-br dark:from-violet-900 dark:to-red-900 dark:text-slate-50 dark:hover:bg-linear-to-br dark:hover:from-violet-800 dark:hover:to-red-800",
      },
      {
        tone: "solid",
        variant: "accent2",
        class:
          "border-orange-700 bg-linear-to-br from-orange-500 to-blue-500 text-white/95 hover:bg-linear-to-br hover:from-orange-400 hover:to-blue-400 dark:bg-linear-to-br dark:from-orange-900 dark:to-blue-900 dark:text-slate-50 dark:hover:bg-linear-to-br dark:hover:from-orange-800 dark:hover:to-blue-800",
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
        tone: "outline",
        variant: "accent1",
        class:
          "border-violet-800 bg-white text-violet-800 dark:border-violet-400 dark:bg-slate-900 dark:text-violet-400",
      },
      {
        tone: "outline",
        variant: "accent2",
        class:
          "border-orange-800 bg-white text-orange-800 dark:border-orange-400 dark:bg-slate-900 dark:text-orange-400",
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
      {
        tone: "secondary",
        variant: "accent1",
        class:
          "border-slate-950/20 bg-linear-to-br from-violet-100 to-red-100 text-white/95 hover:bg-linear-to-br hover:from-violet-100 hover:to-red-100 dark:bg-linear-to-br dark:from-violet-900 dark:to-red-900 dark:text-slate-50 dark:hover:bg-linear-to-br dark:hover:from-violet-800 dark:hover:to-red-800",
      },
      {
        tone: "secondary",
        variant: "accent2",
        class:
          "border-slate-950/20 bg-linear-to-br from-orange-300 to-rose-300 text-white hover:bg-linear-to-br hover:from-orange-300 hover:to-rose-200 dark:bg-linear-to-br dark:from-orange-900 dark:to-rose-900 dark:text-slate-50 dark:hover:bg-linear-to-br dark:hover:from-orange-800 dark:hover:to-rose-800",
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

export const RollingBadge: typeof Badge = (
  props: ComponentPropsWithRef<typeof Badge>,
) => {
  return (
    <Badge {...props} className={cn("p-0 overflow-hidden", props.className)}>
      <RollingText
        textClassName="px-1 py-0.5"
        containerClassName="min-h-0 w-full"
      >
        {props.children}
      </RollingText>
    </Badge>
  );
};
