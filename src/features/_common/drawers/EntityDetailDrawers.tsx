import { Button } from "@/components/ui/button.tsx";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer.tsx";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  entityDrawerDescriptor,
  getEntityStackKey,
} from "./descriptors";
import { useEntityDrawerContext } from "./entityDrawerContext.tsx";

export function EntityDetailDrawers() {
  const {
    services,
    entityStack,
    closeEntityDrawer,
    jumpToEntityStackIndex,
  } = useEntityDrawerContext();
  const open = entityStack.length > 0;
  const activeEntity = entityStack[entityStack.length - 1] ?? null;

  const breadcrumbItems = entityStack.map((entity) => ({
    key: getEntityStackKey(entity),
    label: entityDrawerDescriptor.getLabel(entity),
    title: entityDrawerDescriptor.getTitle(entity),
    tooltip: entityDrawerDescriptor.renderSmallPreview(entity, services),
  }));

  return (
    <Drawer
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          closeEntityDrawer();
        }
      }}
      direction="right"
    >
      <DrawerContent className="inset-y-0 right-0 left-auto h-full w-[min(92vw,980px)] rounded-l-2xl border-l border-border mt-0">
        <DrawerHeader>
          {breadcrumbItems.length > 1 && (
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              {breadcrumbItems.map((item, itemIndex) => (
                <div key={`${item.key}-${itemIndex}`} className="flex items-center gap-1">
                  <SimpleTooltip
                    light
                    delayDuration={400}
                    title={
                      item.tooltip != null ? (
                        <div key={item.key} className="max-w-72 py-0.5">
                          {item.tooltip}
                        </div>
                      ) : (
                        item.title
                      )
                    }
                  >
                    <Button
                      size="xs"
                      variant={
                        itemIndex === breadcrumbItems.length - 1 ? "secondary" : "ghost"
                      }
                      data-no-row-open
                      onClick={() => jumpToEntityStackIndex(itemIndex)}
                      className="h-6 px-2"
                    >
                      {item.label}
                    </Button>
                  </SimpleTooltip>
                  {itemIndex < breadcrumbItems.length - 1 && <span>/</span>}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-start justify-between gap-2">
            <DrawerTitle>
              {activeEntity
                ? entityDrawerDescriptor.getTitle(activeEntity)
                : "Details"}
            </DrawerTitle>
            <div>
              {activeEntity
                ? entityDrawerDescriptor.renderHeaderActions?.(activeEntity, services)
                : null}
            </div>
          </div>
          <DrawerDescription>
            Review links, amounts, and related associations.
          </DrawerDescription>
          {activeEntity
            ? entityDrawerDescriptor.renderSmallPreview(activeEntity, services)
            : null}
        </DrawerHeader>
        <div className="px-4 pb-4 overflow-y-auto flex-1">
          <AnimatePresence mode="wait" initial={false}>
            {activeEntity ? (
              <motion.div
                key={getEntityStackKey(activeEntity)}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {entityDrawerDescriptor.renderDrawerContent(
                  activeEntity,
                  services,
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
