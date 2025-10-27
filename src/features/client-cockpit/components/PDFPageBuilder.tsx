/**
 * PDF Page Builder Component
 * Allows users to select which measures to include in PDF breakdown views
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileText, Hash } from "lucide-react";
import type {
  MeasureDescriptor,
  CubeDataItem,
} from "@/features/_common/Cube/CubeService.types";
import type { PDFPageConfig } from "../models/PDFReportModel";

interface PDFPageBuilderProps {
  pageConfig: PDFPageConfig;
  availableMeasures: MeasureDescriptor<CubeDataItem, unknown>[];
  selectedMeasureIds: string[];
  onMeasureSelectionChange: (measureIds: string[]) => void;
  onPageConfigChange: (config: Partial<PDFPageConfig>) => void;
}

export function PDFPageBuilder({
  pageConfig,
  availableMeasures,
  selectedMeasureIds,
  onMeasureSelectionChange,
  onPageConfigChange,
}: PDFPageBuilderProps) {
  const getMeasureIcon = (
    _measure: MeasureDescriptor<CubeDataItem, unknown>,
  ) => {
    // Use a generic icon since we rely on explicit configuration
    // The serialized config should define the proper formatting
    return <Hash className="h-4 w-4 text-gray-600" />;
  };

  const getMeasureBadgeVariant = (
    _measure: MeasureDescriptor<CubeDataItem, unknown>,
  ) => {
    // Use neutral variant since we rely on explicit configuration
    return "neutral" as const;
  };

  const handleMeasureToggle = (measureId: string, checked: boolean) => {
    if (checked) {
      onMeasureSelectionChange([...selectedMeasureIds, measureId]);
    } else {
      onMeasureSelectionChange(
        selectedMeasureIds.filter((id) => id !== measureId),
      );
    }
  };

  const selectedMeasures = availableMeasures.filter((m) =>
    selectedMeasureIds.includes(m.id),
  );

  return (
    <div className="space-y-6">
      {/* Page Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Page Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="page-title">Page Title</Label>
            <input
              id="page-title"
              type="text"
              value={pageConfig.title}
              onChange={(e) => onPageConfigChange({ title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="page-description">Description</Label>
            <textarea
              id="page-description"
              value={pageConfig.description}
              onChange={(e) =>
                onPageConfigChange({ description: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Measure Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Measures for Breakdown</CardTitle>
          <p className="text-sm text-gray-600">
            Choose which measures to include in this page's breakdown view
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {availableMeasures.map((measure) => (
              <div
                key={measure.id}
                className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Checkbox
                  id={`measure-${measure.id}`}
                  checked={selectedMeasureIds.includes(measure.id)}
                  onCheckedChange={(checked) =>
                    handleMeasureToggle(measure.id, checked as boolean)
                  }
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getMeasureIcon(measure)}
                    <Label
                      htmlFor={`measure-${measure.id}`}
                      className="font-medium cursor-pointer"
                    >
                      {measure.name}
                    </Label>
                    <Badge variant={getMeasureBadgeVariant(measure)}>
                      {measure.formatValue ? "Formatted" : "Raw"}
                    </Badge>
                  </div>
                  {measure.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {measure.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Measures Summary */}
      {selectedMeasures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Measures ({selectedMeasures.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedMeasures.map((measure) => (
                <Badge
                  key={measure.id}
                  variant={getMeasureBadgeVariant(measure)}
                >
                  {getMeasureIcon(measure)}
                  <span className="ml-1">{measure.name}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
