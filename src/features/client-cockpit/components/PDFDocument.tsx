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

  const { metadata, pages, rootLevelMeasures } = pdfReportModel;

  // Helper function to convert image URL to base64 for embedding
  // If the image URL is already a data URL, just return it, otherwise fetch and convert
  const convertImageToBase64 = async (imageUrl: string): Promise<string> => {
    if (imageUrl.startsWith("data:")) {
      console.log("Data URL length:", imageUrl.length);
      console.log("Data URL preview:", imageUrl.substring(0, 100) + "...");
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
  console.log("PDF Document - Logo URL:", metadata.logoUrl);
  if (metadata.logoUrl) {
    try {
      logoBase64 = await convertImageToBase64(metadata.logoUrl);
      console.log(
        "PDF Document - Logo converted to base64:",
        logoBase64 ? "Success" : "Failed",
      );
    } catch (error) {
      console.warn("Failed to embed logo:", error);
      logoBase64 = null;
    }
  } else {
    console.log("PDF Document - No logo URL provided");
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
      border: "1px solid #E5E7EB",
      borderRadius: 8,
      overflow: "hidden",
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: "#F8FAFC",
      borderBottom: "2px solid #E5E7EB",
    },
    tableRow: {
      flexDirection: "row",
      borderBottom: "1px solid #F1F5F9",
      backgroundColor: "#FFFFFF",
    },
    tableRowAlt: {
      flexDirection: "row",
      borderBottom: "1px solid #F1F5F9",
      backgroundColor: "#FAFBFC",
    },
    tableRowGroup: {
      flexDirection: "row",
      borderBottom: "2px solid #3B82F6",
      backgroundColor: "#EFF6FF",
      fontWeight: 600,
    },
    tableCell: {
      padding: 12,
      fontSize: 11,
      flex: 1,
      borderRight: "1px solid #F1F5F9",
      color: "#374151",
    },
    tableCellGroup: {
      padding: 12,
      fontSize: 11,
      flex: 1,
      borderRight: "1px solid #F1F5F9",
      color: "#111827",
      fontWeight: 600,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    tableCellDimension: {
      padding: 12,
      fontSize: 11,
      flex: 1,
      borderRight: "1px solid #F1F5F9",
      color: "#111827",
      fontWeight: 600,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    tableCellMeasure: {
      padding: 12,
      fontSize: 11,
      flex: 0,
      minWidth: 80,
      borderRight: "1px solid #F1F5F9",
      color: "#374151",
      textAlign: "right",
    },
    tableCellMeasureGroup: {
      padding: 12,
      fontSize: 11,
      flex: 0,
      minWidth: 80,
      borderRight: "1px solid #F1F5F9",
      color: "#111827",
      fontWeight: 600,
      textAlign: "right",
    },
    dimensionName: {
      fontSize: 11,
      fontWeight: 600,
      color: "#111827",
    },
    badge: {
      backgroundColor: "#DBEAFE",
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 2,
      minWidth: 20,
      alignItems: "center",
    },
    badgeText: {
      fontSize: 9,
      fontWeight: 600,
      color: "#1E40AF",
    },
    tableCellSub: {
      padding: 8,
      paddingLeft: 24,
      fontSize: 10,
      flex: 1,
      borderRight: "1px solid #F1F5F9",
      color: "#6B7280",
    },
    tableCellNumeric: {
      padding: 12,
      fontSize: 11,
      flex: 1,
      borderRight: "1px solid #F1F5F9",
      color: "#374151",
      textAlign: "right",
    },
    tableCellNumericSub: {
      padding: 8,
      paddingLeft: 24,
      fontSize: 10,
      flex: 1,
      borderRight: "1px solid #F1F5F9",
      color: "#6B7280",
      textAlign: "right",
    },
    tableHeaderCell: {
      fontWeight: 700,
      color: "#111827",
      backgroundColor: "#F8FAFC",
      textAlign: "center",
    },
    summary: {
      marginTop: 20,
      padding: 20,
      backgroundColor: "#F8FAFC",
      borderRadius: 8,
      border: "1px solid #E5E7EB",
    },
    summaryTitle: {
      fontSize: 16,
      fontWeight: 700,
      color: "#111827",
      marginBottom: 15,
    },
    summaryGrid: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
    },
    summaryCard: {
      alignItems: "center",
      flex: 1,
    },
    summaryNumber: {
      fontSize: 24,
      fontWeight: 700,
      marginBottom: 4,
    },
    summaryLabel: {
      fontSize: 12,
      color: "#6B7280",
      fontWeight: 500,
    },
    rootMeasures: {
      marginTop: 30,
      marginBottom: 20,
    },
    rootMeasuresTitle: {
      fontSize: 18,
      fontWeight: 600,
      color: "#111827",
      marginBottom: 15,
      textAlign: "center",
    },
    rootMeasuresGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-around",
      gap: 20,
    },
    rootMeasureCard: {
      alignItems: "center",
      backgroundColor: "#F8FAFC",
      padding: 20,
      borderRadius: 8,
      border: "1px solid #E2E8F0",
      minWidth: 120,
    },
    rootMeasureValue: {
      fontSize: 24,
      fontWeight: 700,
      color: "#1E40AF",
      marginBottom: 5,
    },
    rootMeasureLabel: {
      fontSize: 12,
      color: "#64748B",
      textAlign: "center",
    },
    footer: {
      position: "absolute",
      bottom: 20,
      left: 30,
      right: 30,
      borderTop: "1px solid #E5E7EB",
      paddingTop: 10,
      alignItems: "center",
    },
    footerText: {
      fontSize: 10,
      color: "#9CA3AF",
      textAlign: "center",
    },
    footerLink: {
      color: "#2563EB",
      fontWeight: 600,
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

        {/* Root Level Measurements */}
        {rootLevelMeasures.length > 0 && (
          <View style={styles.rootMeasures}>
            <Text style={styles.rootMeasuresTitle}>Overall Summary</Text>
            <View style={styles.rootMeasuresGrid}>
              {rootLevelMeasures.map((measure) => (
                <View key={measure.id} style={styles.rootMeasureCard}>
                  <Text style={styles.rootMeasureValue}>
                    {measure.formattedValue}
                  </Text>
                  <Text style={styles.rootMeasureLabel}>{measure.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated by{" "}
            <Text style={styles.footerLink}>Passionware Tracker</Text> •
            https://passionware.dev
          </Text>
        </View>
      </Page>

      {/* Individual Pages */}
      {pages.map((pageData, index) => (
        <Page key={pageData.config.id} size="A4" style={styles.page}>
          {/* Page Header */}
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>{pageData.title}</Text>
            <Text style={styles.pageNumber}>Page {index + 2}</Text>
          </View>

          {/* Page Summary */}
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Page Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryNumber, { color: "#3B82F6" }]}>
                  {pageData.summary.totalGroups}
                </Text>
                <Text style={styles.summaryLabel}>Groups</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryNumber, { color: "#10B981" }]}>
                  {pageData.summary.totalSubGroups}
                </Text>
                <Text style={styles.summaryLabel}>Sub-groups</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryNumber, { color: "#8B5CF6" }]}>
                  {pageData.summary.totalItems}
                </Text>
                <Text style={styles.summaryLabel}>Items</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryNumber, { color: "#F59E0B" }]}>
                  {pageData.summary.measures.length}
                </Text>
                <Text style={styles.summaryLabel}>Measures</Text>
              </View>
            </View>
          </View>

          {/* Data Table */}
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellDimension, styles.tableHeaderCell]}>
                {pageData.config.primaryDimension.name}
              </Text>
              {pageData.summary.measures.map((measure) => (
                <Text
                  key={measure.id}
                  style={[styles.tableCellMeasure, styles.tableHeaderCell]}
                >
                  {measure.name}
                </Text>
              ))}
            </View>

            {/* Table Rows */}
            {pageData.cubeData.groups.map((group, groupIndex) => (
              <React.Fragment key={groupIndex}>
                {/* Main group row */}
                <View style={styles.tableRowGroup}>
                  <View style={styles.tableCellDimension}>
                    <Text style={styles.dimensionName}>
                      {group.dimensionLabel || String(group.dimensionValue)}
                    </Text>
                    {pageData.config.secondaryDimension &&
                      group.subGroups &&
                      group.subGroups.length > 0 && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>
                            {group.subGroups.length}
                          </Text>
                        </View>
                      )}
                  </View>
                  {pageData.summary.measures.map((measure) => {
                    const cell = group.cells.find(
                      (c) => c.measureId === measure.id,
                    );
                    return (
                      <Text
                        key={measure.id}
                        style={styles.tableCellMeasureGroup}
                      >
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
                      style={
                        subIndex % 2 === 0
                          ? styles.tableRow
                          : styles.tableRowAlt
                      }
                    >
                      <Text style={styles.tableCellSub}>
                        {subGroup.dimensionLabel ||
                          String(subGroup.dimensionValue)}
                      </Text>
                      {pageData.summary.measures.map((measure) => {
                        const cell = subGroup.cells.find(
                          (c) => c.measureId === measure.id,
                        );
                        return (
                          <Text
                            key={measure.id}
                            style={styles.tableCellNumericSub}
                          >
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

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Generated by{" "}
              <Text style={styles.footerLink}>Passionware Tracker</Text> •
              https://passionware.dev
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
