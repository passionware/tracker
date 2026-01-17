import React, { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const Root = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "grid gap-5 md:grid-cols-[1fr_repeat(5,min-content)]",
        className,
      )}
      {...props}
    />
  ),
);
Root.displayName = "RoleConfigurationGridLayout.Root";

interface ContractorProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle: string;
  avatar: React.ReactNode;
  onAddRole?: () => void;
}

const Contractor = forwardRef<HTMLDivElement, ContractorProps>(
  (
    { className, title, subtitle, avatar, onAddRole, children, ...props },
    ref,
  ) => (
    <Card
      ref={ref}
      className={cn("col-span-full grid grid-cols-subgrid gap-4", className)}
      {...props}
    >
      <CardHeader className="pb-4 col-span-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {avatar}
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{subtitle}</CardDescription>
            </div>
          </div>
          {onAddRole && (
            <Button onClick={onAddRole} size="sm" variant="accent2">
              Add Rate
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 col-span-full grid-cols-subgrid">
        {children}
      </CardContent>
    </Card>
  ),
);
Contractor.displayName = "RoleConfigurationGridLayout.Contractor";

interface ProjectProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const Project = forwardRef<HTMLDivElement, ProjectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          "col-span-full grid grid-cols-subgrid gap-y-3 bg-muted/50 border-muted",
          className,
        )}
        {...props}
      >
        <CardContent className="col-span-full grid grid-cols-subgrid gap-y-3 py-4">
          {children}
        </CardContent>
      </Card>
    );
  },
);
Project.displayName = "RoleConfigurationGridLayout.Project";

const RoleConfigurationGridLayout = {
  Root,
  Contractor,
  Project,
};

export { RoleConfigurationGridLayout };
