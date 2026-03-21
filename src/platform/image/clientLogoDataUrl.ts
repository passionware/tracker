const MAX_IMAGE_BYTES = 1_500_000;

function assertImageMime(mime: string) {
  if (!mime.startsWith("image/")) {
    throw new Error("File is not an image");
  }
}

export async function readImageFileAsDataUrl(file: File): Promise<string> {
  assertImageMime(file.type);
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(
      `Image is too large (max ${Math.round(MAX_IMAGE_BYTES / 1000)} KB)`,
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export async function fetchImageUrlAsDataUrl(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error("URL is empty");
  }
  const response = await fetch(trimmed);
  if (!response.ok) {
    throw new Error(`Could not download image (${response.status})`);
  }
  const blob = await response.blob();
  assertImageMime(blob.type);
  if (blob.size > MAX_IMAGE_BYTES) {
    throw new Error(
      `Image is too large (max ${Math.round(MAX_IMAGE_BYTES / 1000)} KB)`,
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read image"));
    reader.readAsDataURL(blob);
  });
}
