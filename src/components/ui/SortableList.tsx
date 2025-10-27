import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, X } from "lucide-react";
import { Button } from "./button";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";

export interface SortableItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  badge?: string;
  disabled?: boolean;
}

export interface SortableListProps {
  items: SortableItem[];
  selectedItems: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onReorder: (reorderedIds: string[]) => void;
  className?: string;
  itemClassName?: string;
  showReorderHandle?: boolean;
  showRemoveButton?: boolean;
}

export function SortableList({
  items,
  selectedItems,
  onSelectionChange,
  onReorder,
  className,
  itemClassName,
  showReorderHandle = true,
  showRemoveButton = true,
}: SortableListProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);

  // Get selected items in their current order
  const orderedSelectedItems = selectedItems
    .map((id) => items.find((item) => item.id === id))
    .filter(Boolean) as SortableItem[];

  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId);
  };

  const handleDragEnd = () => {
    if (draggedItem && dragOverItem && draggedItem !== dragOverItem) {
      const currentOrder = selectedItems;
      const draggedIndex = currentOrder.indexOf(draggedItem);
      const targetIndex = currentOrder.indexOf(dragOverItem);

      const newOrder = [...currentOrder];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedItem);

      onReorder(newOrder);
    }

    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragOver = (itemId: string) => {
    setDragOverItem(itemId);
  };

  const handleRemove = (itemId: string) => {
    const newSelection = selectedItems.filter((id) => id !== itemId);
    onSelectionChange(newSelection);
  };

  const handleToggle = (itemId: string) => {
    const isSelected = selectedItems.includes(itemId);
    if (isSelected) {
      handleRemove(itemId);
    } else {
      onSelectionChange([...selectedItems, itemId]);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected items (sortable) */}
      <AnimatePresence>
        {orderedSelectedItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-700">
              Selected ({orderedSelectedItems.length})
            </h4>
            <div className="space-y-1">
              {orderedSelectedItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border bg-white",
                    "hover:bg-slate-50 transition-colors",
                    draggedItem === item.id && "opacity-50",
                    dragOverItem === item.id && "ring-2 ring-blue-500",
                    itemClassName,
                  )}
                  draggable={showReorderHandle}
                  onDragStart={() => handleDragStart(item.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => {
                    e.preventDefault();
                    handleDragOver(item.id);
                  }}
                  onDragLeave={() => setDragOverItem(null)}
                >
                  {showReorderHandle && (
                    <div className="cursor-grab active:cursor-grabbing">
                      <GripVertical className="h-4 w-4 text-slate-400" />
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {item.icon && (
                        <span className="text-sm">{item.icon}</span>
                      )}
                      <span className="font-medium text-sm">{item.name}</span>
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          tone="secondary"
                          className="text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-600 mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {showRemoveButton && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(item.id)}
                      className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Available items (not selected) */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-slate-700">
          Available (
          {items.filter((item) => !selectedItems.includes(item.id)).length})
        </h4>
        <div className="space-y-1">
          {items
            .filter((item) => !selectedItems.includes(item.id))
            .map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border bg-white",
                  "hover:bg-slate-50 transition-colors cursor-pointer",
                  item.disabled && "opacity-50 cursor-not-allowed",
                  itemClassName,
                )}
                onClick={() => !item.disabled && handleToggle(item.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {item.icon && <span className="text-sm">{item.icon}</span>}
                    <span className="font-medium text-sm">{item.name}</span>
                    {item.badge && (
                      <Badge
                        variant="secondary"
                        tone="secondary"
                        className="text-xs"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate-600 mt-1">
                      {item.description}
                    </p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    !item.disabled && handleToggle(item.id);
                  }}
                  disabled={item.disabled}
                  className="h-6 w-6 p-0"
                >
                  +
                </Button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
