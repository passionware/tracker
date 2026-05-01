import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileText, Layers } from "lucide-react";

import { ExpandablePanelSection } from "./ExpandablePanelSection.tsx";

const meta = {
  component: ExpandablePanelSection,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Same hierarchy as PanelSectionLabel + SurfaceCard, with a chevron trigger and collapsible body.",
      },
    },
  },
} satisfies Meta<typeof ExpandablePanelSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CollapsedByDefault = {
  args: {
    label: "Description",
    icon: FileText,
    defaultOpen: false,
    selectableContent: true,
    children: (
      <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap wrap-break-word">
        {`Line one\nLine two`}
      </p>
    ),
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-md p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Story;

export const OpenByDefault = {
  args: {
    label: "Notes",
    icon: Layers,
    defaultOpen: true,
    children: (
      <p className="text-sm text-muted-foreground">
        Optional details that can start expanded when context matters.
      </p>
    ),
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-md p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Story;
