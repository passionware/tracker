import { Button } from "@/components/ui/button.tsx";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { ListViewTotalsBar } from "./ListViewTotalsBar.tsx";

const meta = {
  component: ListViewTotalsBar,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Floating pill footer for list totals and bulk actions. Use `sticky={false}` when the bar sits inside a sticky table footer.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="relative min-h-[320px] border border-dashed border-border/80 bg-muted/20 p-4">
        <p className="mb-4 max-w-md text-sm text-muted-foreground">
          Scroll the panel—the bar stays pinned to the bottom when{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">sticky</code>{" "}
          is true.
        </p>
        <div className="h-[480px]" aria-hidden />
        <Story />
      </div>
    ),
  ],
  args: {
    sticky: true,
    children: null,
  },
} satisfies Meta<typeof ListViewTotalsBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const StatsOnly = {
  args: {
    children: (
      <div className="flex flex-wrap items-baseline justify-end gap-x-4 gap-y-1 text-sm">
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">24</span> rows
        </span>
        <span className="text-muted-foreground">
          Total{" "}
          <span className="font-semibold tabular-nums text-foreground">
            182,450.00 USD
          </span>
        </span>
      </div>
    ),
  },
} satisfies Story;

export const WithBulkActions = {
  args: {
    leftSlot: (
      <>
        <Button size="sm" variant="outline">
          Archive
        </Button>
        <Button size="sm" variant="secondary">
          Export
        </Button>
      </>
    ),
    children: (
      <div className="flex flex-wrap items-baseline justify-end gap-x-4 gap-y-1 text-sm">
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">3</span> selected
        </span>
        <span className="text-muted-foreground">
          Sum{" "}
          <span className="font-semibold tabular-nums text-foreground">
            12,400.00 PLN
          </span>
        </span>
      </div>
    ),
  },
} satisfies Story;

export const NonSticky = {
  args: {
    sticky: false,
    className: "bg-card/90",
    children: (
      <span className="text-sm text-muted-foreground">
        Inline footer (e.g. inside sticky{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">tfoot</code>)
      </span>
    ),
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-[200px] items-end justify-center border border-border bg-background p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Story;
