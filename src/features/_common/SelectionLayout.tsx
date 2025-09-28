"use client";

import { Portal } from "@radix-ui/react-portal";
import { Slot } from "@radix-ui/react-slot";
import { isEqual } from "lodash";
import { createContext, ReactNode, useEffect, useRef, useState } from "react";
// import { Slide } from "react-toastify"; // Removed react-toastify

const INITIAL_THRESHOLD = 5;

class DOMVector {
  constructor(
    readonly x: number,
    readonly y: number,
    readonly magnitudeX: number,
    readonly magnitudeY: number,
  ) {}

  getDiagonalLength(): number {
    return Math.sqrt(this.magnitudeX ** 2 + this.magnitudeY ** 2);
  }

  toDOMRect(): DOMRect {
    return new DOMRect(
      Math.min(this.x, this.x + this.magnitudeX),
      Math.min(this.y, this.y + this.magnitudeY),
      Math.abs(this.magnitudeX),
      Math.abs(this.magnitudeY),
    );
  }
}

function intersect(rect1: DOMRect, rect2: DOMRect): boolean {
  return !(
    rect1.right < rect2.left ||
    rect2.right < rect1.left ||
    rect1.bottom < rect2.top ||
    rect2.bottom < rect1.top
  );
}

const SelectedItemContext = createContext<string[]>([]);

export function SelectionLayout({
  children,
  selectedIds,
  onSelectedIdsChange,
}: {
  children?: ReactNode;
  selectedIds: string[];
  onSelectedIdsChange: (selectedIds: string[]) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragVector, setDragVector] = useState<DOMVector | null>(null);
  const [startVector, setStartVector] = useState<DOMVector | null>(null);
  const [initialSelectedIds, setInitialSelectedIds] = useState<string[]>([]);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [isSubtractiveMode, setIsSubtractiveMode] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const onSelectedIdsChangeRef = useRef(onSelectedIdsChange);
  onSelectedIdsChangeRef.current = onSelectedIdsChange;

  // Globalny listener dla Escape
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onSelectedIdsChangeRef.current([]);
        setDragVector(null);
        setStartVector(null);
        setIsDragging(false);
      }
    };
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, []);

  // Funkcja, która aktualizuje zaznaczenie na podstawie końcowego prostokąta
  const updateSelectedItems = (vector: DOMVector) => {
    const next: Record<string, boolean> = {};
    const container = containerRef.current;
    const elements = container
      ? container.querySelectorAll("[data-item-id]")
      : document.querySelectorAll("[data-item-id]");
    elements.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      const itemRect = el.getBoundingClientRect();
      if (intersect(vector.toDOMRect(), itemRect)) {
        if (el.dataset.itemId) {
          next[el.dataset.itemId] = true;
        }
      }
    });
    let newSelectedIds = Object.keys(next);
    if (isSubtractiveMode) {
      newSelectedIds = initialSelectedIds.filter((id) => !next[id]);
    } else if (isCtrlPressed) {
      newSelectedIds = Array.from(
        new Set([...initialSelectedIds, ...newSelectedIds]),
      );
    }
    if (!isEqual(newSelectedIds, selectedIds)) {
      onSelectedIdsChange(newSelectedIds);
    }
  };

  const isTargetOutsideContainer = (
    event: React.MouseEvent | React.KeyboardEvent,
  ) => {
    return (
      event.target instanceof Node &&
      !containerRef.current?.contains(event.target)
    );
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isTargetOutsideContainer(e)) {
      return;
    }
    if (e.button !== 0) return;
    // Zapisujemy punkt początkowy
    setStartVector(new DOMVector(e.clientX, e.clientY, 0, 0));

    if (e.ctrlKey || e.metaKey) {
      setIsCtrlPressed(true);
      const rowElement = (e.target as HTMLElement).closest("[data-item-id]");
      const isStartingOnSelected =
        rowElement instanceof HTMLElement &&
        selectedIds.includes(rowElement.dataset.itemId ?? "");
      setIsSubtractiveMode(isStartingOnSelected);
      setInitialSelectedIds(selectedIds);
    } else {
      setIsCtrlPressed(false);
      setIsSubtractiveMode(false);
      setInitialSelectedIds([]);
    }
    // Nie ustawiamy pointer capture – czekamy aż wykryjemy przeciąganie
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isTargetOutsideContainer(e)) {
      return;
    }
    if (!startVector) return;
    const deltaX = e.clientX - startVector.x;
    const deltaY = e.clientY - startVector.y;
    const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
    if (!isDragging && distance < INITIAL_THRESHOLD) return;
    if (!isDragging) {
      // Gdy wykryjemy przeciąganie, ustawiamy pointer capture
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
    }
    // Aktualizujemy tylko maskę przeciągania
    const newDragVector = new DOMVector(
      startVector.x,
      startVector.y,
      deltaX,
      deltaY,
    );
    setDragVector(newDragVector);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isTargetOutsideContainer(e)) {
      return;
    }
    if (isDragging) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      // Aktualizujemy zaznaczenie dopiero po zakończeniu przeciągania
      if (dragVector) {
        updateSelectedItems(dragVector);
      }
    } else if (!isDragging && e.target === e.currentTarget) {
      // Jeśli nie było przeciągania, kliknięcie w puste miejsce czyści zaznaczenie
      onSelectedIdsChange([]);
    }
    setDragVector(null);
    setStartVector(null);
    setIsDragging(false);
    // Czyścimy zakres zaznaczania (np. zaznaczenie tekstu)
    window.getSelection()?.removeAllRanges();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isTargetOutsideContainer(e)) {
      return;
    }
    if (e.key === "Control" || e.key === "Meta") {
      setIsCtrlPressed(true);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isTargetOutsideContainer(e)) {
      return;
    }
    if (e.key === "Control" || e.key === "Meta") {
      setIsCtrlPressed(false);
    }
  };

  return (
    <>
      <SelectedItemContext.Provider value={selectedIds}>
        <Slot
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          style={
            {
              userSelect: startVector ? "none" : "auto",
              WebkitUserSelect: startVector ? "none" : "auto",
              MozUserSelect: startVector ? "none" : "auto",
              msUserSelect: startVector ? "none" : "auto",
            } as React.CSSProperties
          }
        >
          {children}
        </Slot>
      </SelectedItemContext.Provider>
      {dragVector && isDragging && (
        <Portal>
          <div
            className="z-1000 fixed border-purple-400 border-dashed border-1 rounded-md bg-purple-400/30 pointer-events-none"
            style={{
              top: Math.min(dragVector.y, dragVector.y + dragVector.magnitudeY),
              left: Math.min(
                dragVector.x,
                dragVector.x + dragVector.magnitudeX,
              ),
              width: Math.abs(dragVector.magnitudeX),
              height: Math.abs(dragVector.magnitudeY),
            }}
          />
        </Portal>
      )}
    </>
  );
}
