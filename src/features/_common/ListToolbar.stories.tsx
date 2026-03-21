import { Badge } from "@/components/ui/badge.tsx";
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
          "Sticky bottom toolbar wrapped in a `Card`. Put bulk actions first; show selection count in a badge on the Actions dropdown.",
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
      <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
        <ListToolbarButton variant="default">
          <Download className="mr-1.5 size-4" />
          Export
          <Badge variant="secondary" size="sm" className="ml-1 min-w-5 px-1">
            2
          </Badge>
        </ListToolbarButton>
        <ListToolbarButton variant="destructive">
          <Trash2 className="mr-1.5 size-4" />
          Delete
        </ListToolbarButton>
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
