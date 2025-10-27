/**
 * Domain model for PDF report generation
 * Contains pre-calculated data and metadata for easy PDF rendering
 */

import type {
  CubeResult,
  MeasureDescriptor,
  CubeDataItem,
} from "@/features/_common/Cube/CubeService.types";
import type { FormatService } from "@/services/FormatService/FormatService";
import type { CockpitCubeReportWithCreator } from "@/api/cockpit-cube-reports/cockpit-cube-reports.api";
import type { CockpitTenant } from "@/api/cockpit-tenants/cockpit-tenants.api";

/**
 * Metadata for the PDF report
 */
export interface PDFReportMetadata {
  /** Report title */
  title: string;
  /** Report description */
  description?: string;
  /** Company name */
  companyName: string;
  /** Report date range */
  dateRange: {
    start: Date;
    end: Date;
  };
  /** Generation timestamp */
  generatedAt: Date;
  /** Tenant logo URL (optional) */
  logoUrl?: string;
  /** Report creator information */
  creator?: {
    name: string;
    email: string;
  };
}

/**
 * Configuration for a single PDF page
 */
export interface PDFPageConfig {
  /** Unique page identifier */
  id: string;
  /** Page order in the PDF */
  order: number;
  /** Primary dimension for grouping */
  primaryDimension: {
    id: string;
    name: string;
  };
  /** Secondary dimension for sub-grouping (optional) */
  secondaryDimension?: {
    id: string;
    name: string;
  };
  /** Selected measure IDs to include in this page */
  selectedMeasureIds?: string[];
  /** Sorting configuration */
  sorting: {
    /** Sort primary groups by this measure ID */
    primarySortBy: string;
    /** Sort order for primary groups */
    primarySortOrder: "asc" | "desc";
    /** Sort secondary groups by this measure ID */
    secondarySortBy?: string;
    /** Sort order for secondary groups */
    secondarySortOrder?: "asc" | "desc";
  };
}

/**
 * Pre-calculated data for a PDF page
 */
export interface PDFPageData {
  /** Page configuration */
  config: PDFPageConfig;
  /** Generated page title */
  title: string;
  /** Generated page description */
  description: string;
  /** Pre-calculated cube result */
  cubeData: CubeResult;
  /** Summary statistics */
  summary: {
    totalGroups: number;
    totalSubGroups: number;
    totalItems: number;
    measures: Array<{
      id: string;
      name: string;
      totalValue: number;
      formattedValue: string;
    }>;
  };
}

/**
 * Complete PDF report model
 */
export interface PDFReportModel {
  /** Report metadata */
  metadata: PDFReportMetadata;
  /** Array of pages with pre-calculated data */
  pages: PDFPageData[];
  /** Overall report statistics */
  overallSummary: {
    totalPages: number;
    totalGroups: number;
    totalItems: number;
    dateRange: string;
  };
}

/**
 * Builder class for creating PDFReportModel instances
 */
export class PDFReportModelBuilder {
  private model: Partial<PDFReportModel> = {};

  /**
   * Set the report metadata
   */
  setMetadata(metadata: PDFReportMetadata): this {
    this.model.metadata = metadata;
    return this;
  }

  /**
   * Add a page with pre-calculated data
   */
  addPage(pageData: PDFPageData): this {
    if (!this.model.pages) {
      this.model.pages = [];
    }
    this.model.pages.push(pageData);
    return this;
  }

  /**
   * Build the final PDFReportModel
   */
  build(): PDFReportModel {
    if (!this.model.metadata) {
      throw new Error("Metadata is required");
    }

    if (!this.model.pages || this.model.pages.length === 0) {
      throw new Error("At least one page is required");
    }

    // Sort pages by order
    const sortedPages = this.model.pages.sort(
      (a, b) => a.config.order - b.config.order,
    );

    // Calculate overall summary
    const overallSummary = {
      totalPages: sortedPages.length,
      totalGroups: sortedPages.reduce(
        (sum, page) => sum + page.summary.totalGroups,
        0,
      ),
      totalItems: sortedPages.reduce(
        (sum, page) => sum + page.summary.totalItems,
        0,
      ),
      dateRange: `${this.model.metadata.dateRange.start.toLocaleDateString()} - ${this.model.metadata.dateRange.end.toLocaleDateString()}`,
    };

    return {
      metadata: this.model.metadata,
      pages: sortedPages,
      overallSummary,
    };
  }
}

/**
 * Utility functions for working with PDFReportModel
 */
export class PDFReportModelUtils {
  /**
   * Create a PDFPageData from cube result and configuration
   */
  static createPageData(
    config: PDFPageConfig,
    cubeData: CubeResult,
    _formatService: FormatService,
    measureDescriptors?: MeasureDescriptor<CubeDataItem, unknown>[],
  ): PDFPageData {
    const totalGroups = cubeData.groups.length;
    const totalSubGroups = cubeData.groups.reduce(
      (sum, group) => sum + (group.subGroups?.length || 0),
      0,
    );
    const totalItems = cubeData.groups.reduce(
      (sum, group) => sum + (group.items?.length || 0),
      0,
    );

    // Filter measures based on selected measure IDs
    const selectedMeasureIds = config.selectedMeasureIds || [];
    const shouldIncludeMeasure = (measureId: string) => {
      return (
        selectedMeasureIds.length === 0 ||
        selectedMeasureIds.includes(measureId)
      );
    };

    // Calculate measure totals with proper formatting
    const measures = cubeData.groups.reduce(
      (acc, group) => {
        group.cells.forEach((cell) => {
          // Skip measures that are not selected
          if (!shouldIncludeMeasure(cell.measureId)) {
            return;
          }

          const existing = acc.find((m) => m.id === cell.measureId);
          const measureDescriptor = measureDescriptors?.find(
            (m) => m.id === cell.measureId,
          );

          if (existing) {
            existing.totalValue += Number(cell.value) || 0;
          } else {
            // Use explicit format function from measure descriptor if available
            let formattedValue: string;
            if (measureDescriptor?.formatValue) {
              // Use the measure's built-in formatter (from serialized config)
              // This is the proper way - the serialized config defines the format function
              formattedValue = measureDescriptor.formatValue(cell.value);
            } else {
              // No explicit formatter defined - use raw value
              formattedValue = String(cell.value) || "0";
            }

            acc.push({
              id: cell.measureId,
              name: measureDescriptor?.name || cell.measureId,
              totalValue: Number(cell.value) || 0,
              formattedValue,
            });
          }
        });
        return acc;
      },
      [] as Array<{
        id: string;
        name: string;
        totalValue: number;
        formattedValue: string;
      }>,
    );

    return {
      config,
      title: this.generatePageTitle(
        config.primaryDimension.name,
        config.secondaryDimension?.name,
      ),
      description: this.generatePageDescription(
        config.primaryDimension.name,
        config.secondaryDimension?.name,
      ),
      cubeData,
      summary: {
        totalGroups,
        totalSubGroups,
        totalItems,
        measures,
      },
    };
  }

  /**
   * Create metadata from report and tenant data
   */
  static createMetadata(
    report: CockpitCubeReportWithCreator,
    tenantData?: CockpitTenant,
  ): PDFReportMetadata {
    return {
      title: report.name || "Report",
      description: report.description || undefined,
      companyName: tenantData?.name || "Passionware Consulting sp. z.o.o.",
      dateRange: {
        start: new Date(report.start_date),
        end: new Date(report.end_date),
      },
      generatedAt: new Date(),
      logoUrl: tenantData?.logo_url || undefined,
      creator: {
        name: report.creator_name || "Unknown",
        email: report.creator_email || "unknown@example.com",
      },
    };
  }

  /**
   * Create a complete PDF report model from a cube report
   */
  static async fromCubeReport(
    report: CockpitCubeReportWithCreator,
    pdfConfig: { pages: PDFPageConfig[] },
    formatService: FormatService,
    tenantData?: CockpitTenant,
    options: {
      includeItems?: boolean;
      maxDepth?: number;
      skipEmptyGroups?: boolean;
    } = {},
  ): Promise<PDFReportModel> {
    const {
      includeItems = true,
      maxDepth = 10,
      skipEmptyGroups = false,
    } = options;

    // Import cube service dynamically to avoid circular dependencies
    const { deserializeCubeConfig } = await import(
      "@/features/_common/Cube/serialization/CubeSerialization"
    );

    // Deserialize the cube configuration
    const cubeConfig = deserializeCubeConfig(
      report.cube_config as any,
      report.cube_data.data as any[],
    );

    // Create metadata
    const metadata = this.createMetadata(report, tenantData);

    // Build the report model
    const builder = new PDFReportModelBuilder().setMetadata(metadata);

    // Process each page configuration
    for (const pageConfig of pdfConfig.pages) {
      const pageData = await this.buildPageData(
        pageConfig,
        cubeConfig,
        formatService,
        {
          includeItems,
          maxDepth,
          skipEmptyGroups,
        },
      );

      builder.addPage(pageData);
    }

    return builder.build();
  }

  /**
   * Create page configuration from dimension selections
   */
  static createPageConfig(
    primaryDimensionId: string,
    secondaryDimensionId: string | undefined,
    dimensions: Array<{ id: string; name: string }>,
    order: number,
  ): PDFPageConfig {
    const primaryDimension = dimensions.find(
      (d) => d.id === primaryDimensionId,
    );
    const secondaryDimension = secondaryDimensionId
      ? dimensions.find((d) => d.id === secondaryDimensionId)
      : undefined;

    if (!primaryDimension) {
      throw new Error(`Primary dimension ${primaryDimensionId} not found`);
    }

    return {
      id: `page-${Date.now()}-${order}`,
      order,
      primaryDimension: {
        id: primaryDimension.id,
        name: primaryDimension.name,
      },
      secondaryDimension: secondaryDimension
        ? {
            id: secondaryDimension.id,
            name: secondaryDimension.name,
          }
        : undefined,
      sorting: {
        primarySortBy: "hours",
        primarySortOrder: "desc",
      },
    };
  }

  /**
   * Generate a page title from dimensions
   */
  private static generatePageTitle(
    primaryName: string,
    secondaryName?: string,
  ): string {
    const primary = primaryName.charAt(0).toUpperCase() + primaryName.slice(1);

    if (secondaryName) {
      const secondary =
        secondaryName.charAt(0).toUpperCase() + secondaryName.slice(1);
      return `${secondary}s by ${primary}s`;
    }

    return `${primary}s`;
  }

  /**
   * Generate a page description from dimensions
   */
  private static generatePageDescription(
    primaryName: string,
    secondaryName?: string,
  ): string {
    if (secondaryName) {
      return `Data grouped by ${primaryName} with breakdown by ${secondaryName}.`;
    }

    return `Data grouped by ${primaryName}.`;
  }

  /**
   * Build page data for a single page configuration
   */
  private static async buildPageData(
    pageConfig: PDFPageConfig,
    cubeConfig: any, // CubeConfig
    formatService: FormatService,
    options: {
      includeItems?: boolean;
      maxDepth?: number;
      skipEmptyGroups?: boolean;
    },
  ): Promise<PDFPageData> {
    // Import stateless calculation functions
    const { calculateCubeGroups } = await import(
      "@/features/_common/Cube/CubeCalculation"
    );

    // Calculate first level groups (primary dimension)
    const firstLevelGroups = calculateCubeGroups(
      cubeConfig.data,
      [], // Empty path for root level
      pageConfig.primaryDimension.id,
      cubeConfig.dimensions,
      cubeConfig.measures,
      options,
    );

    // Calculate second level groups (secondary dimension) if specified
    if (pageConfig.secondaryDimension) {
      firstLevelGroups.forEach((group) => {
        const secondLevelGroups = calculateCubeGroups(
          cubeConfig.data,
          [
            {
              dimensionId: group.dimensionId,
              dimensionValue: group.dimensionValue,
            },
          ],
          pageConfig.secondaryDimension!.id,
          cubeConfig.dimensions,
          cubeConfig.measures,
          options,
        );

        if (secondLevelGroups.length > 0) {
          group.subGroups = secondLevelGroups;
        }
      });
    }

    // Apply sorting (always required)
    // Sort primary groups
    firstLevelGroups.sort((a, b) => {
      const aCell = a.cells.find(
        (c) => c.measureId === pageConfig.sorting.primarySortBy,
      );
      const bCell = b.cells.find(
        (c) => c.measureId === pageConfig.sorting.primarySortBy,
      );

      const aValue = aCell ? Number(aCell.value) || 0 : 0;
      const bValue = bCell ? Number(bCell.value) || 0 : 0;

      const order = pageConfig.sorting.primarySortOrder === "desc" ? -1 : 1;
      return (aValue - bValue) * order;
    });

    // Sort secondary groups if configured
    if (pageConfig.sorting.secondarySortBy) {
      firstLevelGroups.forEach((group) => {
        if (group.subGroups) {
          group.subGroups.sort((a, b) => {
            const aCell = a.cells.find(
              (c) => c.measureId === pageConfig.sorting.secondarySortBy,
            );
            const bCell = b.cells.find(
              (c) => c.measureId === pageConfig.sorting.secondarySortBy,
            );

            const aValue = aCell ? Number(aCell.value) || 0 : 0;
            const bValue = bCell ? Number(bCell.value) || 0 : 0;

            const order =
              pageConfig.sorting.secondarySortOrder === "desc" ? -1 : 1;
            return (aValue - bValue) * order;
          });
        }
      });
    }

    const groups = firstLevelGroups;

    // Create cube result structure
    const cubeData = {
      groups,
      totalItems: cubeConfig.data.length,
      grandTotals: [], // Not needed for PDF
      filteredData: options.includeItems ? cubeConfig.data : undefined,
      config: cubeConfig,
    };

    // Create page data with formatting
    return this.createPageData(
      pageConfig,
      cubeData,
      formatService,
      cubeConfig.measures,
    );
  }
}
