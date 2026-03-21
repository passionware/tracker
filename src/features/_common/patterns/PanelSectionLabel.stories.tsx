import type { Meta, StoryObj } from "@storybook/react-vite";
import { Layers, ListFilter, Wand2 } from "lucide-react";

import { PanelSectionLabel } from "./PanelSectionLabel.tsx";
import { SurfaceCard } from "./SurfaceCard.tsx";

const meta = {
  title: "Common/Patterns/PanelSectionLabel",
  component: PanelSectionLabel,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Small uppercase section heading with optional Lucide icon. Use above grouped fields inside cards or drawers.",
      },
    },
  },
} satisfies Meta<typeof PanelSectionLabel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithIcon = {
  args: {
    children: "Structure",
    icon: Layers,
  },
} satisfies Story;

export const WithoutIcon = {
  args: {
    children: "Details",
  },
} satisfies Story;

export const OnCard = {
  args: {
    children: "Placeholder",
  },
  render: () => (
    <SurfaceCard className="w-full max-w-md space-y-4">
      <PanelSectionLabel icon={ListFilter}>Filters</PanelSectionLabel>
      <p className="text-sm text-muted-foreground">
        Labels inherit muted foreground and tight tracking so they read as
        hierarchy, not body text.
      </p>
      <PanelSectionLabel icon={Wand2}>Suggestions</PanelSectionLabel>
      <p className="text-sm text-muted-foreground">
        Stack multiple sections with consistent spacing (<code className="rounded bg-muted px-1 py-0.5 text-xs">mb-3</code>{" "}
        on the label).
      </p>
    </SurfaceCard>
  ),
} satisfies Story;
