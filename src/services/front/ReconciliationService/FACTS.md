# Facts in Reconciliation Service

## Overview

Facts are declarative statements that describe **what should exist** in the system based on a generated report. They represent the expected state of reports, costs, billings, and their relationships, without checking whether these entities already exist in the database.

The `convertGeneratedReportToFacts` function transforms raw time entry data (from external sources like TMetric) into a structured set of facts that the reconciliation service can then use to:
1. Compare against existing data
2. Determine what needs to be created, updated, or deleted
3. Generate a reconciliation preview

## What Are Facts?

Facts are **declarative expectations** - they describe the ideal state of the system. Think of them as a blueprint or specification of what the system should contain, rather than a direct representation of what currently exists.

### Key Characteristics

- **Declarative**: Facts describe "what should be" rather than "what is"
- **Idempotent**: The same input always produces the same facts
- **Independent**: Facts don't check for existing entities - that's the reconciler's job
- **Linked**: Facts include relationships (via UUIDs) that help the reconciler match existing entities

## Types of Facts

### 1. ReportFact

**Purpose**: Describes a time report that should exist for a contractor.

**What it represents**:
- A contractor's work hours for a specific period
- Grouped by contractor + rate (same contractor with same rate = one report)
- Contains cost information (what we pay the contractor)

**Key fields**:
- `contractorId`: Which contractor did the work
- `periodStart` / `periodEnd`: Time period covered
- `quantity`: Total hours worked
- `unitPrice`: Cost rate per hour
- `netValue`: Total cost (quantity × unitPrice)
- `workspaceId`: Which workspace this contractor belongs to
- `projectIterationId`: Which project iteration this belongs to

**Example**: A contractor worked 8 hours at 50 EUR/hour = ReportFact with quantity=8, unitPrice=50, netValue=400

### 2. CostFact

**Purpose**: Describes a cost entry (expense) that should exist for paying a contractor.

**What it represents**:
- The cost of paying a contractor for their work
- Linked to reports via LinkCostReportFact (see below)
- Used for accounting/expense tracking

**Key fields**:
- `contractorId`: Which contractor to pay
- `netValue`: Amount to pay (matches the report's netValue)
- `invoiceNumber`: Generated invoice number (e.g., "COST-2024-01-1")
- `workspaceId`: Which workspace this cost belongs to

**Example**: Pay contractor 400 EUR for 8 hours of work = CostFact with netValue=400

### 3. LinkCostReportFact

**Purpose**: Describes the relationship between a cost and a report.

**What it represents**:
- Links a cost entry to a time report
- Provides detailed breakdown of how the cost relates to the report
- Used to track which costs correspond to which reports
- **Source of truth** for cost-report relationships (used for highlighting)

**Key fields**:
- `costAmount`: Amount in the cost
- `reportAmount`: Amount in the report
- `breakdown`: Detailed information (quantity, unit prices, currencies, exchange rate)
- `linkedFacts`: Array of fact UUIDs - the source of truth for relationships

**Example**: Links a 400 EUR cost to an 8-hour report at 50 EUR/hour

### 4. BillingFact

**Purpose**: Describes a billing entry (invoice) that should exist for charging a client.

**What it represents**:
- An invoice to send to the client
- Grouped by workspace + currency (all reports in same workspace/currency = one billing)
- Contains billing information (what we charge the client)
- Linked to reports via LinkBillingReportFact (see below)

**Key fields**:
- `totalNet`: Total amount to bill (sum of all related reports' billing amounts)
- `totalGross`: Gross amount (currently same as net)
- `currency`: Billing currency
- `workspaceId`: Which workspace this billing belongs to
- `clientId`: Which client to bill
- `invoiceNumber`: Generated invoice number (e.g., "INV-2024-01-WS1")

**Example**: Bill client 600 EUR (from 8 hours × 75 EUR/hour) = BillingFact with totalNet=600

### 5. LinkBillingReportFact

**Purpose**: Describes the relationship between a billing and a report.

**What it represents**:
- Links a billing entry to a time report
- Shows how much of the billing comes from each report
- Provides detailed breakdown for reconciliation
- **Source of truth** for report-billing relationships (used for highlighting)

**Key fields**:
- `reportAmount`: Amount from the report (cost side)
- `billingAmount`: Amount in the billing (revenue side)
- `linkType`: Always "reconcile" for generated reports
- `breakdown`: Detailed information (quantity, unit prices, currencies)
- `linkedFacts`: Array of fact UUIDs - the source of truth for relationships

**Example**: Links a 600 EUR billing to an 8-hour report (400 EUR cost, 600 EUR billing)

## How Facts Are Generated

### Step 1: Group Time Entries

Time entries are grouped by:
- **Contractor ID**: Same contractor
- **Rate signature**: Same cost rate, billing rate, currencies, activity types, task types, and project IDs

This ensures that all entries with the same contractor and rate are combined into a single report.

### Step 2: Create Report and Cost Facts

For each contractor+rate group:
1. Calculate total hours and amounts
2. Create a **ReportFact** with aggregated data
3. Create a **CostFact** linked to the ReportFact
4. Create a **LinkCostReportFact** connecting them

### Step 3: Group Reports for Billing

Reports are grouped by:
- **Workspace ID**: Same workspace
- **Billing currency**: Same currency

This ensures all reports in the same workspace/currency are billed together.

### Step 4: Create Billing Facts

For each workspace+currency group:
1. Sum up all billing amounts from reports
2. Create a **BillingFact** with the total
3. Create **LinkBillingReportFact** for each report in the group

## Example Flow

### Input: Generated Report with Time Entries

```
Time Entry 1: Contractor 1, 8 hours, Rate: 50 EUR/h cost, 75 EUR/h billing
Time Entry 2: Contractor 1, 4 hours, Rate: 50 EUR/h cost, 75 EUR/h billing
Time Entry 3: Contractor 2, 8 hours, Rate: 50 EUR/h cost, 75 EUR/h billing
```

### Output: Facts Generated

**ReportFacts** (2 facts):
- ReportFact 1: Contractor 1, 12 hours (8+4), 600 EUR cost, 900 EUR billing
- ReportFact 2: Contractor 2, 8 hours, 400 EUR cost, 600 EUR billing

**CostFacts** (2 facts):
- CostFact 1: Contractor 1, 600 EUR, linked to ReportFact 1
- CostFact 2: Contractor 2, 400 EUR, linked to ReportFact 2

**LinkCostReportFacts** (2 facts):
- Link 1: CostFact 1 ↔ ReportFact 1
- Link 2: CostFact 2 ↔ ReportFact 2

**BillingFacts** (1 fact, assuming same workspace):
- BillingFact 1: 1500 EUR total (900 + 600), workspace 1, EUR

**LinkBillingReportFacts** (2 facts):
- Link 1: BillingFact 1 ↔ ReportFact 1 (900 EUR)
- Link 2: BillingFact 1 ↔ ReportFact 2 (600 EUR)

## Why Use Facts?

### Separation of Concerns

- **Facts Generator**: Pure function that converts input to expectations
- **Reconciler**: Compares facts to existing data and determines actions

### Testability

Facts are easy to test because they're pure transformations with no side effects.

### Flexibility

The same facts can be used for:
- Preview generation (show what would change)
- Actual reconciliation (apply changes)
- Validation (check if facts are valid)

### Traceability

Each fact has a UUID and relationships, making it easy to track:
- Which facts came from which time entries
- How facts relate to each other
- What the reconciler decided to do with each fact

## Important Notes

### Workspace Determination

Contractors don't have a direct workspace property. The workspace is determined by:
1. Checking existing reports (if available)
2. Checking rate variables for each workspace (if available)
3. Falling back to the first workspace in the project

This is handled by the `contractorWorkspaceMap` parameter.

### Rounding

All monetary values and quantities are rounded to 2 decimal places to avoid floating-point precision issues.

### Skipping Invalid Entries

If a time entry doesn't have a matching rate, it's skipped with a warning. The function continues processing other entries.

### Currency Handling

Currently, the function assumes cost and billing currencies can be different, but exchange rates are set to 1 (same currency). Future enhancements may support currency conversion.

## Usage

```typescript
import { convertGeneratedReportToFacts } from "./convertGeneratedReportToFacts";
import { determineContractorWorkspaces } from "./determineContractorWorkspace";

// Get contractor workspace mappings
const contractorWorkspaceMap = await determineContractorWorkspaces({
  project,
  contractorIds: [1, 2, 3],
  services,
});

// Generate facts
const facts = convertGeneratedReportToFacts(
  generatedReport,
  projectIteration,
  project,
  contractorWorkspaceMap,
);

// Facts can now be used by the reconciler to determine what needs to be created/updated
```

## Related Files

- `convertGeneratedReportToFacts.ts`: The main function that generates facts
- `ReconciliationService.types.ts`: Type definitions for facts
- `calculateReportReconciliation.helper.ts`: Uses facts to calculate reconciliation preview
- `ReconciliationService.ts`: Main reconciliation service interface
