import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet.tsx";
import { cn } from "@/lib/utils.ts";
import { PopoverContentProps } from "@radix-ui/react-popover";
import { ReactNode } from "react";

const sheetPickerSurfaceClassName = cn(
  "flex w-full flex-col gap-0 overflow-hidden rounded-t-2xl border-0 p-0 shadow-xl",
  "max-h-[min(90dvh,720px)] pb-[env(safe-area-inset-bottom,0px)] pt-10",
  // Default Sheet close sits top-right; keep picker full-width below it.
  "[&>button]:right-3 [&>button]:top-3",
);

/**
 * On narrow viewports, renders a bottom sheet instead of a popover so pickers
 * get full width, comfortable height, and predictable touch UX.
 */
export function PickerPopoverOrSheet({
  isMobile,
  open,
  onOpenChange,
  trigger,
  children,
  align,
  side,
  sheetTitle,
}: {
  isMobile: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  align: PopoverContentProps["align"];
  side: PopoverContentProps["side"];
  /** Shown only to screen readers (Radix dialog title requirement). */
  sheetTitle: string;
}) {
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className={sheetPickerSurfaceClassName}>
          <SheetHeader className="sr-only">
            <SheetTitle>{sheetTitle}</SheetTitle>
          </SheetHeader>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-fit max-w-md min-w-0 p-0"
        align={align}
        side={side}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
