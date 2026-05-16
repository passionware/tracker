const MIME_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "text/csv": "csv",
  "text/plain": "txt",
};

const EXTENSION_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_EXTENSION).map(([mime, ext]) => [ext, mime]),
);

export function getFilesFromDataTransfer(
  dataTransfer: DataTransfer | null,
): File[] {
  if (!dataTransfer) return [];
  if (dataTransfer.files?.length) {
    return Array.from(dataTransfer.files);
  }
  const out: File[] = [];
  for (const item of Array.from(dataTransfer.items)) {
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file) out.push(file);
    }
  }
  return out;
}

export function getFirstFileFromDataTransfer(
  dataTransfer: DataTransfer | null,
): File | null {
  return getFilesFromDataTransfer(dataTransfer)[0] ?? null;
}

export function getFilesFromClipboardData(
  clipboardData: DataTransfer | null,
): File[] {
  return getFilesFromDataTransfer(clipboardData);
}

/** Screenshots from the clipboard often have an empty name — assign one for display/API. */
export function ensureFileName(file: File, fallbackBase: string): File {
  const ext =
    extensionFromMime(file.type) ??
    extensionFromFileName(file.name) ??
    "bin";
  const mime =
    file.type ||
    EXTENSION_MIME[ext] ||
    (ext === "bin" ? "application/octet-stream" : `image/${ext}`);
  if (file.name.trim().length > 0) {
    if (file.type) return file;
    return new File([file], file.name, { type: mime });
  }
  return new File([file], `${fallbackBase}.${ext}`, { type: mime });
}

function extensionFromMime(mime: string): string | null {
  if (!mime) return null;
  return MIME_EXTENSION[mime] ?? null;
}

function extensionFromFileName(name: string): string | null {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return null;
  return name.slice(dot + 1).toLowerCase() || null;
}
