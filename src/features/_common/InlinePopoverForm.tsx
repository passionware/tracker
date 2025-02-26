import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { OpenState } from "@/features/_common/OpenState.tsx";
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
          {bag.open && (
            <Portal>
              <div className="isolate fixed z-[51] inset-0 backdrop-brightness-[0.7] backdrop-saturate-[0.3] z-40" />
            </Portal>
          )}
          <PopoverContent
            className="w-fit z-[51] relative"
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
