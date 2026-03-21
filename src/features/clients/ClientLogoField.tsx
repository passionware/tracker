import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { FileDropEmptyState } from "@/features/_common/patterns/FileDropEmptyState.tsx";
import { SelectedUploadCard } from "@/features/_common/patterns/SelectedUploadCard.tsx";
import { UploadDropCard } from "@/features/_common/patterns/UploadDropCard.tsx";
import {
  fetchImageUrlAsDataUrl,
  readImageFileAsDataUrl,
} from "@/platform/image/clientLogoDataUrl.ts";
import { cn } from "@/lib/utils.ts";
import { ImageIcon, Link2, Trash2, Upload } from "lucide-react";
import { useCallback, useId, useState } from "react";

export interface ClientLogoFieldProps {
  value: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
}

export function ClientLogoField(props: ClientLogoFieldProps) {
  const inputId = useId();
  const [dragActive, setDragActive] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const applyFile = useCallback(
    async (file: File) => {
      setUrlError(null);
      setBusy(true);
      try {
        const dataUrl = await readImageFileAsDataUrl(file);
        props.onChange(dataUrl);
      } catch (err) {
        setUrlError(err instanceof Error ? err.message : "Could not read image");
      } finally {
        setBusy(false);
      }
    },
    [props],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        void applyFile(file);
      }
    },
    [applyFile],
  );

  const loadFromUrl = useCallback(async () => {
    setUrlError(null);
    setBusy(true);
    try {
      const dataUrl = await fetchImageUrlAsDataUrl(urlDraft);
      props.onChange(dataUrl);
      setUrlDraft("");
    } catch (err) {
      setUrlError(
        err instanceof Error
          ? err.message
          : "Could not load image (check URL or CORS)",
      );
    } finally {
      setBusy(false);
    }
  }, [props, urlDraft]);

  const disabled = Boolean(props.disabled || busy);

  return (
    <div
      className={cn("space-y-3", disabled && "pointer-events-none opacity-60")}
    >
      <UploadDropCard
        icon={<ImageIcon aria-hidden />}
        title="Logo"
        description="PNG, JPG, or SVG — drag, browse, or use an image URL below."
        bodyClassName="min-h-[min(240px,40vh)] lg:min-h-[220px]"
      >
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) {
              void applyFile(file);
            }
          }}
        />

        {props.value ? (
          <div
            className={cn(
              "flex flex-1 flex-col rounded-xl transition-[box-shadow] duration-150",
              dragActive &&
                "ring-2 ring-primary ring-offset-2 ring-offset-background",
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <SelectedUploadCard
              leading={
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-background">
                  <img
                    src={props.value}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              }
              title="Current logo"
              actions={
                <>
                  <Button type="button" variant="outline" size="sm" asChild>
                    <label htmlFor={inputId} className="cursor-pointer">
                      <Upload className="mr-1.5 size-4" />
                      Replace
                    </label>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={() => props.onChange(null)}
                  >
                    <Trash2 className="mr-1.5 size-4" />
                    Remove
                  </Button>
                </>
              }
            />
          </div>
        ) : (
          <FileDropEmptyState
            inputId={inputId}
            title="Choose an image"
            description="Or drag a file here — PNG, JPG, or SVG"
            className={cn(
              dragActive && "border-primary/70 bg-primary/5",
            )}
            icon={
              <ImageIcon
                className="mb-3 size-10"
                aria-hidden
              />
            }
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          />
        )}
      </UploadDropCard>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label
            htmlFor={`${inputId}-url`}
            className="text-xs text-muted-foreground"
          >
            Image URL
          </Label>
          <Input
            id={`${inputId}-url`}
            placeholder="https://…"
            value={urlDraft}
            disabled={disabled}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void loadFromUrl();
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          disabled={disabled || !urlDraft.trim()}
          onClick={() => void loadFromUrl()}
        >
          <Link2 className="mr-1.5 size-4" />
          Load from URL
        </Button>
      </div>
      {urlError ? (
        <p className="text-sm text-destructive" role="alert">
          {urlError}
        </p>
      ) : null}
    </div>
  );
}
