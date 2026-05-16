import {
  ensureFileName,
  getFirstFileFromDataTransfer,
  getFilesFromClipboardData,
} from "@/features/_common/patterns/fileUploadTransfer.ts";
import { useCallback, useState } from "react";
import type { ClipboardEvent, DragEvent } from "react";

export interface UseFileDropZoneOptions {
  onFile: (file: File) => void;
  disabled?: boolean;
  /** Used when pasted/dropped files have no name (e.g. screenshots). */
  unnamedFileBase?: string;
}

export function useFileDropZone({
  onFile,
  disabled = false,
  unnamedFileBase = "upload",
}: UseFileDropZoneOptions) {
  const [dragActive, setDragActive] = useState(false);

  const deliverFile = useCallback(
    (file: File | null) => {
      if (!file || disabled) return;
      onFile(ensureFileName(file, unnamedFileBase));
    },
    [disabled, onFile, unnamedFileBase],
  );

  const onDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setDragActive(true);
    },
    [disabled],
  );

  const onDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setDragActive(true);
    },
    [disabled],
  );

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      deliverFile(getFirstFileFromDataTransfer(e.dataTransfer));
    },
    [deliverFile],
  );

  const onPaste = useCallback(
    (e: ClipboardEvent) => {
      const files = getFilesFromClipboardData(e.clipboardData);
      if (files.length === 0) return;
      e.preventDefault();
      deliverFile(files[0] ?? null);
    },
    [deliverFile],
  );

  return {
    dragActive,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    onPaste,
  };
}
