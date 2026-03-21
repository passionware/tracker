import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Summary,
  SummaryEntry,
  SummaryEntryValue,
} from "./Summary.tsx";

const meta = {
  component: Summary,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "`Summary` is a layout wrapper (`grid` or `strip`). Use `SummaryEntry` + `SummaryEntryValue` for labeled metrics.",
      },
    },
  },
  args: {
    variant: "grid" as const,
    children: null,
  },
} satisfies Meta<typeof Summary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Grid = {
  args: {
    variant: "grid",
    children: (
      <>
        <SummaryEntry label="Billed" description="Across visible rows">
          <SummaryEntryValue>48,200.00 USD</SummaryEntryValue>
        </SummaryEntry>
        <SummaryEntry label="To charge">
          <SummaryEntryValue>12,150.50 EUR</SummaryEntryValue>
        </SummaryEntry>
        <SummaryEntry label="Hours">
          <SummaryEntryValue compact>312.5</SummaryEntryValue>
        </SummaryEntry>
        <SummaryEntry label="Margin" description="After costs">
          <div className="flex flex-wrap gap-2">
            <SummaryEntryValue>18%</SummaryEntryValue>
            <SummaryEntryValue compact className="!text-muted-foreground">
              ~ 9.1k USD
            </SummaryEntryValue>
          </div>
        </SummaryEntry>
      </>
    ),
  },
} satisfies Story;

export const Strip = {
  args: {
    variant: "strip",
    className: "justify-end",
    children: (
      <>
        <SummaryEntry variant="strip" label="Net" description="After discounts">
          <SummaryEntryValue compact>22,400 PLN</SummaryEntryValue>
        </SummaryEntry>
        <SummaryEntry variant="strip" label="VAT">
          <SummaryEntryValue compact>5,152 PLN</SummaryEntryValue>
        </SummaryEntry>
        <SummaryEntry variant="strip" label="Gross">
          <SummaryEntryValue compact>27,552 PLN</SummaryEntryValue>
        </SummaryEntry>
      </>
    ),
  },
} satisfies Story;
