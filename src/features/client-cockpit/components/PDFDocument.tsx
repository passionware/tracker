/**
 * PDF Document Component
 * Generates the actual PDF document using react-pdf/renderer
 */

import React from "react";
import type { PDFReportModel } from "../models/PDFReportModel";
import type { FormatService } from "@/services/FormatService/FormatService";

export async function generatePDFDocument(
  pdfReportModel: PDFReportModel,
  formatService: FormatService,
) {
  const { Document, Page, Text, View, StyleSheet, Font, Image } = await import(
    "@react-pdf/renderer"
  );

  const { metadata, pages } = pdfReportModel;

  // Helper function to convert image URL to base64 for embedding
  // If the image URL is already a data URL, just return it, otherwise fetch and convert
  const convertImageToBase64 = async (imageUrl: string): Promise<string> => {
    if (imageUrl.startsWith("data:")) {
      return imageUrl;
    }
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn("Failed to convert image to base64:", error);
      return imageUrl; // Fallback to original URL
    }
  };

  // Convert logo to base64 if available
  let logoBase64: string | null = null;
  if (metadata.logoUrl) {
    try {
      logoBase64 = await convertImageToBase64(metadata.logoUrl);
    } catch (error) {
      console.warn("Failed to embed logo:", error);
    }
  }

  // Register fonts
  Font.register({
    family: "Roboto",
    fonts: [
      {
        src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf",
        fontWeight: 300,
      },
      {
        src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf",
        fontWeight: 400,
      },
      {
        src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf",
        fontWeight: 500,
      },
      {
        src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
        fontWeight: 700,
      },
    ],
  });

  const styles = StyleSheet.create({
    page: {
      flexDirection: "column",
      backgroundColor: "#FFFFFF",
      padding: 30,
      fontFamily: "Roboto",
    },
    header: {
      alignItems: "center",
      marginBottom: 30,
      borderBottom: "1px solid #E5E7EB",
      paddingBottom: 20,
    },
    logoContainer: {
      marginBottom: 15,
    },
    logo: {
      width: 80,
      height: 80,
      objectFit: "contain",
    },
    title: {
      fontSize: 24,
      fontWeight: 700,
      color: "#111827",
      marginBottom: 8,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 14,
      color: "#6B7280",
      marginBottom: 4,
      textAlign: "center",
    },
    date: {
      fontSize: 12,
      color: "#9CA3AF",
      marginTop: 8,
      textAlign: "center",
    },
    toc: {
      marginTop: 20,
    },
    tocTitle: {
      fontSize: 18,
      fontWeight: 600,
      color: "#111827",
      marginBottom: 15,
    },
    tocItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
      paddingVertical: 4,
    },
    pageHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
      borderBottom: "1px solid #E5E7EB",
      paddingBottom: 10,
    },
    pageTitle: {
      fontSize: 18,
      fontWeight: 600,
      color: "#111827",
    },
    pageNumber: {
      fontSize: 12,
      color: "#6B7280",
    },
    pageContent: {
      flex: 1,
    },
    table: {
      marginTop: 20,
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: "#F9FAFB",
      borderBottom: "1px solid #E5E7EB",
    },
    tableRow: {
      flexDirection: "row",
      borderBottom: "1px solid #F3F4F6",
    },
    tableCell: {
      padding: 8,
      fontSize: 10,
      flex: 1,
      borderRight: "1px solid #F3F4F6",
    },
    tableHeaderCell: {
      fontWeight: 600,
      color: "#374151",
      backgroundColor: "#F9FAFB",
    },
    summary: {
      marginTop: 20,
      padding: 15,
      backgroundColor: "#F9FAFB",
      borderRadius: 8,
    },
    summaryTitle: {
      fontSize: 14,
      fontWeight: 600,
      color: "#111827",
      marginBottom: 10,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 5,
    },
    summaryLabel: {
      fontSize: 10,
      color: "#6B7280",
    },
    summaryValue: {
      fontSize: 10,
      fontWeight: 500,
      color: "#111827",
    },
  });

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {logoBase64 && (
            <View style={styles.logoContainer}>
              <Image src={logoBase64} style={styles.logo} />
            </View>
          )}
          <Text style={styles.title}>{metadata.title}</Text>
          <Text style={styles.subtitle}>{metadata.companyName}</Text>
          <Text style={styles.subtitle}>
            {formatService.temporal.date(metadata.dateRange.start)} -{" "}
            {formatService.temporal.date(metadata.dateRange.end)}
          </Text>
          <Text style={styles.date}>
            Generated on {formatService.temporal.date(metadata.generatedAt)}
          </Text>
        </View>

        {/* Table of Contents */}
        <View style={styles.toc}>
          <Text style={styles.tocTitle}>Table of Contents</Text>
          {pages.map((pageData, index) => (
            <View key={pageData.config.id} style={styles.tocItem}>
              <Text>
                {index + 1}. {pageData.config.title}
              </Text>
              <Text>Page {index + 2}</Text>
            </View>
          ))}
        </View>
      </Page>

      {/* Individual Pages */}
      {pages.map((pageData, index) => (
        <Page key={pageData.config.id} size="A4" style={styles.page}>
          {/* Page Header */}
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>{pageData.config.title}</Text>
            <Text style={styles.pageNumber}>Page {index + 2}</Text>
          </View>

          {/* Page Summary */}
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Page Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Groups:</Text>
              <Text style={styles.summaryValue}>
                {pageData.summary.totalGroups}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sub-groups:</Text>
              <Text style={styles.summaryValue}>
                {pageData.summary.totalSubGroups}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items:</Text>
              <Text style={styles.summaryValue}>
                {pageData.summary.totalItems}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Measures:</Text>
              <Text style={styles.summaryValue}>
                {pageData.summary.measures.length}
              </Text>
            </View>
          </View>

          {/* Data Table */}
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>
                {pageData.config.primaryDimension.name}
              </Text>
              {pageData.config.secondaryDimension && (
                <Text style={[styles.tableCell, styles.tableHeaderCell]}>
                  {pageData.config.secondaryDimension.name}
                </Text>
              )}
              {pageData.summary.measures.map((measure) => (
                <Text
                  key={measure.id}
                  style={[styles.tableCell, styles.tableHeaderCell]}
                >
                  {measure.name}
                </Text>
              ))}
            </View>

            {/* Table Rows */}
            {pageData.cubeData.groups.map((group, groupIndex) => (
              <React.Fragment key={groupIndex}>
                {/* Main group row */}
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>
                    {group.dimensionLabel || String(group.dimensionValue)}
                  </Text>
                  {pageData.config.secondaryDimension && (
                    <Text style={styles.tableCell}>
                      {group.subGroups?.length || 0} sub-groups
                    </Text>
                  )}
                  {pageData.summary.measures.map((measure) => {
                    const cell = group.cells.find(
                      (c) => c.measureId === measure.id,
                    );
                    return (
                      <Text key={measure.id} style={styles.tableCell}>
                        {cell?.formattedValue ||
                          (cell?.value ? String(cell.value) : "-")}
                      </Text>
                    );
                  })}
                </View>

                {/* Sub-groups rows */}
                {pageData.config.secondaryDimension &&
                  group.subGroups &&
                  group.subGroups.length > 0 &&
                  group.subGroups.map((subGroup, subIndex) => (
                    <View
                      key={`${groupIndex}-${subIndex}`}
                      style={styles.tableRow}
                    >
                      <Text style={[styles.tableCell, { paddingLeft: 16 }]}>
                        ↳{" "}
                        {subGroup.dimensionLabel ||
                          String(subGroup.dimensionValue)}
                      </Text>
                      <Text style={styles.tableCell}>-</Text>
                      {pageData.summary.measures.map((measure) => {
                        const cell = subGroup.cells.find(
                          (c) => c.measureId === measure.id,
                        );
                        return (
                          <Text key={measure.id} style={styles.tableCell}>
                            {cell?.formattedValue ||
                              (cell?.value ? String(cell.value) : "-")}
                          </Text>
                        );
                      })}
                    </View>
                  ))}
              </React.Fragment>
            ))}
          </View>
        </Page>
      ))}
    </Document>
  );
}
