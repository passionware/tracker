import { Button } from "@/components/ui/button.tsx";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer.tsx";
import { AnimatePresence, motion } from "framer-motion";
import { EntityDrawerNode } from "./useEntityDrawerState.ts";

export interface EntityDetailDrawersProps {
  entityStack: EntityDrawerNode[];
  onOpenChange: (open: boolean) => void;
  onBreadcrumbSelect: (index: number) => void;
}

export function EntityDetailDrawers({
  entityStack,
  onOpenChange,
  onBreadcrumbSelect,
}: EntityDetailDrawersProps) {
  const open = entityStack.length > 0;
  const activeNode = entityStack[entityStack.length - 1];
  const breadcrumbItems = entityStack;

  return (
    <Drawer
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onOpenChange(false);
        }
      }}
      direction="right"
    >
      <DrawerContent className="inset-y-0 right-0 left-auto h-full w-[min(92vw,980px)] rounded-l-2xl border-l border-border mt-0">
        <DrawerHeader>
          <div className="flex items-start justify-between gap-2">
            <DrawerTitle>{activeNode?.title ?? "Details"}</DrawerTitle>
            <div>{activeNode?.renderHeaderActions?.()}</div>
          </div>
          <DrawerDescription>
            Review links, amounts, and related associations.
          </DrawerDescription>
          {activeNode?.renderMainInfo?.()}
          {breadcrumbItems.length > 1 && (
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              {breadcrumbItems.map((item, itemIndex) => (
                <div key={`${item.key}-${itemIndex}`} className="flex items-center gap-1">
                  <Button
                    size="xs"
                    variant={
                      itemIndex === breadcrumbItems.length - 1 ? "secondary" : "ghost"
                    }
                    data-no-row-open
                    onClick={() => onBreadcrumbSelect(itemIndex)}
                    className="h-6 px-2"
                  >
                    {item.label}
                  </Button>
                  {itemIndex < breadcrumbItems.length - 1 && <span>/</span>}
                </div>
              ))}
            </div>
          )}
        </DrawerHeader>
        <div className="px-4 pb-4 overflow-y-auto flex-1">
          <AnimatePresence mode="wait" initial={false}>
            {activeNode ? (
              <motion.div
                key={activeNode.key}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {activeNode.render()}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
