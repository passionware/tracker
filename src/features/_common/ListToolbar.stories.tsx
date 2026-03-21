import type { Meta, StoryObj } from "@storybook/react-vite";
import { Download, Trash2 } from "lucide-react";

import { ListToolbar, ListToolbarButton } from "./ListToolbar.tsx";

const meta = {
  component: ListToolbar,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Sticky bottom toolbar wrapped in a `Card`. Pair primary actions with `ListToolbarButton` (small size by default).",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="relative flex min-h-[280px] flex-col border border-dashed border-border/80 bg-muted/15">
        <div className="flex-1 p-4">
          <p className="max-w-md text-sm text-muted-foreground">
            Toolbar sticks to the bottom of this scrollable region.
          </p>
        </div>
        <Story />
      </div>
    ),
  ],
  args: {
    children: null,
  },
} satisfies Meta<typeof ListToolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {
  args: {
    children: (
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">2 items selected</span>
        <div className="flex flex-wrap gap-2">
          <ListToolbarButton variant="default">
            <Download className="mr-1.5 size-4" />
            Export
          </ListToolbarButton>
          <ListToolbarButton variant="destructive">
            <Trash2 className="mr-1.5 size-4" />
            Delete
          </ListToolbarButton>
        </div>
      </div>
    ),
  },
} satisfies Story;

export const SingleAction = {
  args: {
    children: (
      <div className="flex w-full justify-end">
        <ListToolbarButton variant="accent1">Apply to selection</ListToolbarButton>
      </div>
    ),
  },
} satisfies Story;
