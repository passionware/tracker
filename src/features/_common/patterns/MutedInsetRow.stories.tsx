import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button.tsx";
import { Building2, Unlink2 } from "lucide-react";

import { MutedInsetRow } from "./MutedInsetRow.tsx";

const meta = {
  component: MutedInsetRow,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Horizontal inset row for entity lists in drawers (workspace + actions, etc.). Pairs with `PanelSectionLabel` and `SurfaceCard`.",
      },
    },
  },
} satisfies Meta<typeof MutedInsetRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EntityAndAction = {
  render: () => (
    <MutedInsetRow className="max-w-md">
      <Building2 className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        Workspace North
      </span>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Unlink">
        <Unlink2 className="size-4" />
      </Button>
    </MutedInsetRow>
  ),
} satisfies Story;
