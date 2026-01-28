import { cn } from "@/lib/utils";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

const Tabs = TabsPrimitive.Root;

const tabsListVariants = cva("border-b border-border flex items-center", {
  variants: {
    size: {
      sm: "gap-4",
      md: "gap-8",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

const tabsTriggerVariants = cva(
  "flex gap-2 items-center whitespace-nowrap border-b-2 border-transparent font-medium text-muted-foreground hover:border-border hover:text-foreground focus-visible:bg-accent outline-none rounded-t-sm data-[state=active]:border-primary data-[state=active]:text-foreground",
  {
    variants: {
      size: {
        sm: "px-1 py-2 text-xs",
        md: "px-1 py-4 text-sm",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, size, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsListVariants({ size }), className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, size, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTriggerVariants({ size }), className)}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-2", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
