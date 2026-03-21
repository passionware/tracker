import { cn } from "@/lib/utils.ts";
import { Upload } from "lucide-react";
import type { DragEvent, ReactNode } from "react";

export interface FileDropEmptyStateProps {
  inputId: string;
  title: string;
  description: string;
  className?: string;
  icon?: ReactNode;
  onDragEnter?: (e: DragEvent<HTMLLabelElement>) => void;
  onDragLeave?: (e: DragEvent<HTMLLabelElement>) => void;
  onDragOver?: (e: DragEvent<HTMLLabelElement>) => void;
  onDrop?: (e: DragEvent<HTMLLabelElement>) => void;
}

/**
 * Large dashed drop / browse target (label linked to a hidden file input).
 * Matches the AI billing matcher upload affordance.
 */
export function FileDropEmptyState({
  inputId,
  title,
  description,
  className,
  icon = <Upload className="mb-3 size-10" aria-hidden />,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
}: FileDropEmptyStateProps) {
  return (
    <label
      htmlFor={inputId}
      className={cn(
        "group flex flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/90 bg-muted/15 px-6 py-12 text-center transition-colors",
        "hover:border-primary/45 hover:bg-muted/30",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
        className,
      )}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <span className="text-muted-foreground transition-colors group-hover:text-primary [&_svg]:mx-auto [&_svg]:block">
        {icon}
      </span>
      <span className="font-medium text-foreground">{title}</span>
      <span className="mt-1 block max-w-xs text-sm text-muted-foreground">
        {description}
      </span>
    </label>
  );
}
