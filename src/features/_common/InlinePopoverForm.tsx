import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { OpenState } from "@/features/_common/OpenState.tsx";
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
          {bag.open && <div className="fixed inset-0 backdrop-brightness-[0.7] backdrop-saturate-[0.3] z-40" />}
          <PopoverContent
            className="w-fit z-50 relative"
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
