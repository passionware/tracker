import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer.tsx";
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
        <Drawer {...bag} direction="right">
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
          <DrawerContent className="inset-y-0 right-0 left-auto h-full w-[min(92vw,980px)] rounded-l-2xl border-l border-border mt-0">
            <div className="px-4 pb-4 overflow-y-auto flex-1 min-h-0">
              {content(bag)}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </OpenState>
  );
};
