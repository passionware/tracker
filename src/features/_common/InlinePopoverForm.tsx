import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { OpenState } from "@/features/_common/OpenState.tsx";
import { cn } from "@/lib/utils";
import { Portal } from "@radix-ui/react-popover";
import { ReactNode } from "react";

export interface InlinePopoverForm {
  trigger: ReactNode;
  content: (bag: { close: () => void }) => ReactNode;
}

export const InlinePopoverForm = ({ trigger, content }: InlinePopoverForm) => {
  return (
    <OpenState>
      {(bag) => (
        <Popover modal {...bag}>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <Portal forceMount>
            <div
              className={cn(
                "isolate transition-opacity duration-200 fixed  inset-0 backdrop-brightness-[0.7] backdrop-saturate-[0.3]",
                bag.open ? "opacity-100" : "opacity-0 pointer-events-none",
              )}
            />
          </Portal>
          <PopoverContent
            className="w-fit relative"
            align="end"
            onEscapeKeyDown={bag.close}
            onInteractOutside={(event) => event.preventDefault()} // Prevent closing on outside click
          >
            {content(bag)}
          </PopoverContent>
        </Popover>
      )}
    </OpenState>
  );
};
