import { Button, ButtonProps } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export interface ListToolbarProps {
  children: ReactNode;
  className?: string;
}

export function ListToolbar({ children, className }: ListToolbarProps) {
  return (
    <Card
      className={cn(
        "sticky bottom-0 border-0 rounded-none shadow-lg",
        className,
      )}
    >
      <div className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 px-2 py-1.5 sm:gap-x-3 sm:gap-y-2 sm:px-3 sm:py-2">
        {children}
      </div>
    </Card>
  );
}

export interface ListToolbarButtonProps extends ButtonProps {
  variant?: "default" | "destructive" | "warning" | "accent1" | "accent2";
}

export function ListToolbarButton({ ...props }: ListToolbarButtonProps) {
  return <Button size="sm" {...props} />;
}

export interface ListToolbarDropdownProps {
  children?: ReactNode;
  trigger: ReactNode;
  className?: string;
}
