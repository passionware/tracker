/**
 * JSON Tree Viewer
 *
 * A reusable component for displaying JSON data with expandable nodes,
 * syntax highlighting, and clean formatting.
 */

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface JsonTreeViewerProps {
  data: unknown;
  title?: string;
  className?: string;
  initiallyExpanded?: boolean;
  maxDepth?: number;
}

function ExpandableButton({
  isExpanded,
  onToggle,
  children,
  className = "",
}: {
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "flex items-center gap-1 w-full text-left py-0.5 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
        className,
      )}
    >
      <ChevronRight
        className={cn(
          "w-3 h-3 mt-0.5 shrink-0 transition-transform",
          isExpanded && "[transform:rotate(90deg)]",
        )}
      />
      {children}
    </button>
  );
}

function AnimatedContainer({
  isExpanded,
  children,
  className = "",
}: {
  isExpanded: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeInOut" }}
          className={cn("overflow-hidden", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface JsonTreeNodeProps {
  value: unknown;
  path: string;
  label?: string | number;
  initiallyExpanded: boolean;
  maxDepth?: number;
  currentDepth?: number;
}

function JsonTreeNode({
  value,
  path,
  label,
  initiallyExpanded,
  maxDepth = 10,
  currentDepth = 0,
}: JsonTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  // Check if we've reached max depth
  if (currentDepth >= maxDepth) {
    return (
      <span className="text-gray-500 italic">
        {Array.isArray(value)
          ? `[...${value.length} items]`
          : `{...${Object.keys(value as object).length} keys}`}
      </span>
    );
  }

  // Render primitive values
  if (value === null) {
    return <span className="text-gray-500 italic">null</span>;
  }

  if (value === undefined) {
    return <span className="text-gray-500 italic">undefined</span>;
  }

  if (typeof value === "string") {
    return (
      <span className="text-green-600 dark:text-green-400">"{value}"</span>
    );
  }

  if (typeof value === "number") {
    return <span className="text-blue-600 dark:text-blue-400">{value}</span>;
  }

  if (typeof value === "boolean") {
    return (
      <span className="text-purple-600 dark:text-purple-400">
        {String(value)}
      </span>
    );
  }

  // Render arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-gray-500">[]</span>;
    }

    const preview = <span className="text-gray-500">[{value.length}]</span>;

    return (
      <>
        {label !== undefined && (
          <ExpandableButton
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded(!isExpanded)}
          >
            <span className="text-gray-600 dark:text-gray-400">{label}:</span>{" "}
            {!isExpanded && preview}
          </ExpandableButton>
        )}
        <AnimatedContainer isExpanded={isExpanded} className="ml-4">
          {value.map((item, index) => {
            const itemPath = `${path}.${index}`;
            const itemHasChildren =
              typeof item === "object" &&
              item !== null &&
              (Array.isArray(item)
                ? item.length > 0
                : Object.keys(item).length > 0);

            return (
              <div key={index}>
                {itemHasChildren ? (
                  <JsonTreeNode
                    value={item}
                    path={itemPath}
                    label={index}
                    initiallyExpanded={false}
                    maxDepth={maxDepth}
                    currentDepth={currentDepth + 1}
                  />
                ) : (
                  <div className="flex items-start gap-1 py-0.5 px-1 -ml-1">
                    <span className="w-3 shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {index}:
                    </span>{" "}
                    <JsonTreeNode
                      value={item}
                      path={itemPath}
                      initiallyExpanded={false}
                      maxDepth={maxDepth}
                      currentDepth={currentDepth + 1}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </AnimatedContainer>
      </>
    );
  }

  // Render objects
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>);

    if (entries.length === 0) {
      return <span className="text-gray-500">{"{}"}</span>;
    }

    const preview = (
      <span className="text-gray-500">
        {"{"}
        {entries.length}
        {"}"}
      </span>
    );

    return (
      <>
        {label !== undefined && (
          <ExpandableButton
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded(!isExpanded)}
          >
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {label}:
            </span>{" "}
            {!isExpanded && preview}
          </ExpandableButton>
        )}
        <AnimatedContainer isExpanded={isExpanded} className="ml-4">
          {entries.map(([k, v]) => {
            const childPath = path ? `${path}.${k}` : k;
            const childHasChildren =
              typeof v === "object" &&
              v !== null &&
              (Array.isArray(v) ? v.length > 0 : Object.keys(v).length > 0);

            return (
              <div key={k}>
                {childHasChildren ? (
                  <JsonTreeNode
                    value={v}
                    path={childPath}
                    label={k}
                    initiallyExpanded={false}
                    maxDepth={maxDepth}
                    currentDepth={currentDepth + 1}
                  />
                ) : (
                  <div className="flex items-start gap-1 py-0.5 px-1 -ml-1">
                    <span className="w-3 shrink-0" />
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {k}:
                    </span>{" "}
                    <JsonTreeNode
                      value={v}
                      path={childPath}
                      initiallyExpanded={false}
                      maxDepth={maxDepth}
                      currentDepth={currentDepth + 1}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </AnimatedContainer>
      </>
    );
  }

  return <span className="text-gray-500">{String(value)}</span>;
}

/**
 * JSON Tree Viewer Component
 *
 * Displays JSON data in an expandable tree format with syntax highlighting.
 * Perfect for viewing configuration objects, API responses, or any structured data.
 *
 * @example
 * ```tsx
 * <JsonTreeViewer
 *   data={config}
 *   title="Cube Configuration"
 *   initiallyExpanded={true}
 * />
 * ```
 */
export function JsonTreeViewer({
  data,
  title,
  className,
  initiallyExpanded = true,
  maxDepth = 10,
}: JsonTreeViewerProps) {
  return (
    <div className={cn("w-full flex flex-col", className)}>
      {title && (
        <div className="mb-3 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
        </div>
      )}
      <div className="font-mono text-sm bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 overflow-auto flex-1 min-h-0">
        <JsonTreeNode
          value={data}
          path=""
          initiallyExpanded={initiallyExpanded}
          maxDepth={maxDepth}
        />
      </div>
    </div>
  );
}
