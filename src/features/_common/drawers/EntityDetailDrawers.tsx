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
  type EntityStackItem,
} from "./descriptors";
import { useEntityDrawerContext } from "./entityDrawerContext.tsx";
import { ChevronRight } from "lucide-react";

const defaultDrawerDescription =
  "Review links, amounts, and related associations.";

function isFormStackEntity(entity: EntityStackItem): boolean {
  return (
    entity.type === "billing-form" ||
    entity.type === "client-form" ||
    entity.type === "workspace-form" ||
    entity.type === "cost-form" ||
    entity.type === "report-form" ||
    entity.type === "project-iteration-form" ||
    entity.type === "project-form" ||
    entity.type === "bulk-create-cost-for-reports" ||
    (entity.type === "project-iteration" && entity.intent === "create")
  );
}

/** Same shell as bulk create cost (`BulkCreateCostPanel`): flex body + inner scroll, footer outside scroll. */
function usesBulkCostDrawerShell(entity: EntityStackItem): boolean {
  return (
    entity.type === "client-form" ||
    entity.type === "workspace-form" ||
    entity.type === "project-form" ||
    entity.type === "bulk-create-cost-for-reports"
  );
}

function drawerDescriptionForEntity(entity: EntityStackItem): string {
  switch (entity.type) {
    case "client":
      return "Manage workspace links. Edit name, bank sender, and visibility from the actions menu.";
    case "client-form":
      return "Update name, logo, and bank sender label.";
    case "workspace":
      return "Link or unlink clients below. Slug, ID, and visibility are in the header; edit from the actions menu.";
    case "workspace-form":
      return "Update workspace name, slug, and logo.";
    case "project":
      return "Project summary and workspace links. Edit from the header menu or card actions; delete from the card.";
    case "billing-form":
    case "cost-form":
    case "report-form":
    case "project-iteration-form":
      return "Edit the fields below and save, or cancel to go back.";
    case "project-form":
      return "Update project name, status, client, workspaces, and description.";
    case "project-iteration":
      return entity.intent === "create"
        ? "Set period, currency, and optional budget target, then save to create the iteration."
        : "Iteration summary, generated reports, new report import, and reconciliation via the full iteration UI.";
    case "generated-report-reconciliation":
      return "Match generated time to reports, billings, and costs; preview and apply reconciliation.";
    case "bulk-create-cost-for-reports":
      return "Create one cost and map selected reports to cost links in one step.";
    default:
      return defaultDrawerDescription;
  }
}

export function EntityDetailDrawers() {
  const { services, entityStack, closeEntityDrawer, jumpToEntityStackIndex } =
    useEntityDrawerContext();
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
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground -ml-2 -mt-2">
              {breadcrumbItems.map((item, itemIndex) => (
                <div
                  key={`${item.key}-${itemIndex}`}
                  className="flex items-center gap-1"
                >
                  <SimpleTooltip
                    light
                    side="bottom"
                    align="start"
                    title={item.tooltip}
                    contentClassName="max-w-none p-0 border-none"
                  >
                    <Button
                      size="xs"
                      variant="ghost"
                      data-no-row-open
                      onClick={() => jumpToEntityStackIndex(itemIndex)}
                      className={
                        itemIndex === breadcrumbItems.length - 1
                          ? "h-6 px-2 font-medium text-foreground hover:text-foreground"
                          : "h-6 px-2"
                      }
                    >
                      {item.label}
                    </Button>
                  </SimpleTooltip>
                  {itemIndex < breadcrumbItems.length - 1 && (
                    <ChevronRight className="w-3 h-3" />
                  )}
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
                ? entityDrawerDescriptor.renderHeaderActions?.(
                    activeEntity,
                    services,
                  )
                : null}
            </div>
          </div>
          {activeEntity ? (
            isFormStackEntity(activeEntity) &&
            activeEntity.type !== "client-form" &&
            activeEntity.type !== "workspace-form" &&
            activeEntity.type !== "project-form" &&
            activeEntity.type !== "bulk-create-cost-for-reports" ? (
              <DrawerDescription className="sr-only">
                {drawerDescriptionForEntity(activeEntity)}
              </DrawerDescription>
            ) : (
              <DrawerDescription>
                {drawerDescriptionForEntity(activeEntity)}
              </DrawerDescription>
            )
          ) : (
            <DrawerDescription>{defaultDrawerDescription}</DrawerDescription>
          )}
          {activeEntity
            ? entityDrawerDescriptor.renderSmallPreview(activeEntity, services)
            : null}
        </DrawerHeader>
        {activeEntity && usesBulkCostDrawerShell(activeEntity) ? (
          <div className="flex min-h-0 flex-1 flex-col px-4">
            <AnimatePresence mode="wait" initial={false}>
              {activeEntity ? (
                <motion.div
                  key={getEntityStackKey(activeEntity)}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  {entityDrawerDescriptor.renderDrawerContent(
                    activeEntity,
                    services,
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
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
        )}
      </DrawerContent>
    </Drawer>
  );
}
