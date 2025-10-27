/**
 * PDF Preview Component
 * Renders a preview of the PDF report using the domain model
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import type { PDFReportModel } from "../models/PDFReportModel";
import type { FormatService } from "@/services/FormatService/FormatService";

interface PDFPreviewProps {
  pdfReportModel: PDFReportModel;
  formatService: FormatService;
}

export function PDFPreview({ pdfReportModel, formatService }: PDFPreviewProps) {
  const { metadata, pages } = pdfReportModel;

  return (
    <div className="space-y-6">
      {/* PDF Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center border-b pb-4 mb-4">
          {metadata.logoUrl && (
            <div className="mb-4">
              <img
                src={metadata.logoUrl}
                alt="Company Logo"
                className="h-16 w-auto mx-auto object-contain"
              />
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {metadata.title}
          </h1>
          <p className="text-gray-600 mb-2">{metadata.companyName}</p>
          <p className="text-sm text-gray-500">
            {formatService.temporal.date(metadata.dateRange.start)} -{" "}
            {formatService.temporal.date(metadata.dateRange.end)}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Generated on {formatService.temporal.date(metadata.generatedAt)}
          </p>
        </div>

        {/* Report Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {pdfReportModel.overallSummary.totalPages}
            </div>
            <div className="text-sm text-gray-600">Pages</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {pdfReportModel.overallSummary.totalGroups}
            </div>
            <div className="text-sm text-gray-600">Groups</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {pdfReportModel.overallSummary.totalItems}
            </div>
            <div className="text-sm text-gray-600">Items</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {pages.reduce(
                (sum, page) => sum + page.summary.measures.length,
                0,
              )}
            </div>
            <div className="text-sm text-gray-600">Measures</div>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Table of Contents
          </h2>
          <div className="space-y-1">
            {pages.map((pageData, index) => (
              <div
                key={pageData.config.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-700">
                  {index + 1}. {pageData.config.title}
                </span>
                <Badge variant="secondary" className="text-xs">
                  Page {index + 2}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Individual Pages Preview */}
      {pages.map((pageData, index) => (
        <PDFPagePreview
          key={pageData.config.id}
          pageData={pageData}
          pageNumber={index + 1}
          formatService={formatService}
        />
      ))}
    </div>
  );
}

/**
 * Individual page preview component
 */
interface PDFPagePreviewProps {
  pageData: PDFReportModel["pages"][0];
  pageNumber: number;
  formatService: FormatService;
}

function PDFPagePreview({
  pageData,
  pageNumber,
  formatService,
}: PDFPagePreviewProps) {
  const { config, cubeData, summary } = pageData;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{config.title}</h2>
          <p className="text-sm text-gray-600">Page {pageNumber}</p>
          {config.description && (
            <p className="text-sm text-gray-500 mt-1">{config.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-800">
            📊 Primary: {config.primaryDimension.name}
          </Badge>
          {config.secondaryDimension && (
            <Badge variant="secondary" className="text-gray-600">
              📊 Secondary: {config.secondaryDimension.name}
            </Badge>
          )}
        </div>
      </div>

      {/* Page Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-600">
            {summary.totalGroups}
          </div>
          <div className="text-xs text-gray-600">Groups</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600">
            {summary.totalSubGroups}
          </div>
          <div className="text-xs text-gray-600">Sub-groups</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-purple-600">
            {summary.totalItems}
          </div>
          <div className="text-xs text-gray-600">Items</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-orange-600">
            {summary.measures.length}
          </div>
          <div className="text-xs text-gray-600">Measures</div>
        </div>
      </div>

      {/* Data Table Preview */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Data Preview
        </h3>
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  {config.primaryDimension.name}
                </th>
                {config.secondaryDimension && (
                  <th className="px-4 py-3 text-left font-medium text-gray-700">
                    {config.secondaryDimension.name}
                  </th>
                )}
                {summary.measures.map((measure) => (
                  <th
                    key={measure.id}
                    className="px-4 py-3 text-left font-medium text-gray-700"
                  >
                    {measure.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cubeData.groups.slice(0, 5).map((group, groupIndex) => (
                <React.Fragment key={groupIndex}>
                  {/* Main group row */}
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {group.dimensionLabel ||
                        String(group.dimensionValue) ||
                        "Total"}
                    </td>
                    {config.secondaryDimension && (
                      <td className="px-4 py-3 text-gray-600">
                        {group.subGroups && group.subGroups.length > 0
                          ? `${group.subGroups.length} sub-groups`
                          : "-"}
                      </td>
                    )}
                    {summary.measures.map((measure) => {
                      const cell = group.cells.find(
                        (c) => c.measureId === measure.id,
                      );
                      return (
                        <td
                          key={measure.id}
                          className="px-4 py-3 text-gray-600"
                        >
                          {cell?.value ? String(cell.value) : "-"}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Sub-groups rows (show first 2) */}
                  {config.secondaryDimension &&
                    group.subGroups &&
                    group.subGroups.length > 0 &&
                    group.subGroups.slice(0, 2).map((subGroup, subIndex) => (
                      <tr
                        key={`${groupIndex}-${subIndex}`}
                        className="bg-gray-50"
                      >
                        <td className="px-4 py-2 text-sm text-gray-600 pl-8">
                          ↳{" "}
                          {subGroup.dimensionLabel ||
                            String(subGroup.dimensionValue)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">-</td>
                        {summary.measures.map((measure) => {
                          const cell = subGroup.cells.find(
                            (c) => c.measureId === measure.id,
                          );
                          return (
                            <td
                              key={measure.id}
                              className="px-4 py-2 text-sm text-gray-600"
                            >
                              {cell?.value ? String(cell.value) : "-"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </React.Fragment>
              ))}
              {cubeData.groups.length > 5 && (
                <tr>
                  <td
                    colSpan={
                      (config.secondaryDimension ? 2 : 1) +
                      summary.measures.length
                    }
                    className="px-4 py-3 text-center text-gray-500 text-sm"
                  >
                    ... and {cubeData.groups.length - 5} more groups
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Page Footer */}
      <div className="border-t pt-4 text-xs text-gray-500 text-center">
        Report: {config.title} • Generated on{" "}
        {formatService.temporal.date(new Date())} • Page {pageNumber}
      </div>
    </div>
  );
}

/**
 * Empty state component when no pages are configured
 */
export function PDFPreviewEmpty() {
  return (
    <div className="text-center py-12">
      <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">PDF Preview</h3>
      <p className="text-gray-600 mb-4">
        Configure pages to see the preview here
      </p>
      <Badge variant="secondary">0 pages configured</Badge>
    </div>
  );
}
