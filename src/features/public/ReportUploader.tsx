import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ReportUploaderProps {
  onReportUpload: (data: any, fileName: string) => void;
}

export function ReportUploader({ onReportUpload }: ReportUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (files: FileList) => {
      setError(null);
      setSuccess(null);
      setUploading(true);

      try {
        for (const file of Array.from(files)) {
          if (!file.name.endsWith(".json")) {
            setError(`File ${file.name} is not a JSON file`);
            continue;
          }

          const text = await file.text();
          const data = JSON.parse(text);

          onReportUpload(data, file.name);
          setSuccess(`Successfully uploaded ${file.name}`);
        }
      } catch (err) {
        setError(
          `Error parsing JSON: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      } finally {
        setUploading(false);
      }
    },
    [onReportUpload],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles],
  );

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 rounded-full bg-muted">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <Label htmlFor="file-upload" className="cursor-pointer">
              <span className="text-lg font-medium">
                {dragActive ? "Drop files here" : "Upload JSON files"}
              </span>
            </Label>
            <Input
              id="file-upload"
              type="file"
              multiple
              accept=".json"
              onChange={handleFileInput}
              className="hidden"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Drag and drop JSON files here, or click to select files
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => document.getElementById("file-upload")?.click()}
            disabled={uploading}
          >
            <FileText className="h-4 w-4 mr-2" />
            {uploading ? "Uploading..." : "Choose Files"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
