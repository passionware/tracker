import type { Meta, StoryObj } from "@storybook/react-vite";
import { CreditCard, SlidersHorizontal } from "lucide-react";

import { IconTile } from "./IconTile.tsx";
import { PanelSectionLabel } from "./PanelSectionLabel.tsx";
import { SurfaceCard } from "./SurfaceCard.tsx";

const meta = {
  title: "Common/Patterns/SurfaceCard",
  component: SurfaceCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Bordered inset panel for settings blocks, summaries, and drawer sections. Pairs well with `PanelSectionLabel` and `IconTile`.",
      },
    },
  },
} satisfies Meta<typeof SurfaceCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {
  render: (args) => (
    <SurfaceCard className="w-full max-w-md" {...args}>
      <p className="text-sm text-muted-foreground">
        Content sits on a subtle card surface with rounded corners and a light
        border—useful when you need visual grouping without a heavy modal.
      </p>
    </SurfaceCard>
  ),
} satisfies Story;

export const WithSections = {
  render: (args) => (
    <SurfaceCard className="w-full max-w-lg space-y-6" {...args}>
      <section>
        <PanelSectionLabel icon={SlidersHorizontal}>
          Preferences
        </PanelSectionLabel>
        <p className="text-sm leading-relaxed text-foreground">
          Section copy and controls go here. Labels stay small and uppercase for
          scanability.
        </p>
      </section>
      <section>
        <PanelSectionLabel icon={CreditCard}>Billing</PanelSectionLabel>
        <div className="flex items-start gap-3">
          <IconTile variant="muted">
            <CreditCard />
          </IconTile>
          <p className="text-sm text-muted-foreground">
            Icon tiles give list rows and headers a consistent hit of color and
            alignment.
          </p>
        </div>
      </section>
    </SurfaceCard>
  ),
} satisfies Story;

export const Dense = {
  render: (args) => (
    <SurfaceCard className="w-72 p-4 text-sm" {...args}>
      Pass <code className="rounded bg-muted px-1 py-0.5 text-xs">className</code>{" "}
      to tune padding or width when the default <code className="rounded bg-muted px-1 py-0.5 text-xs">p-5</code>{" "}
      is too roomy.
    </SurfaceCard>
  ),
} satisfies Story;
