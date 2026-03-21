import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button.tsx";
import { FileText } from "lucide-react";

import { IconTile } from "./IconTile.tsx";
import { SelectedUploadCard } from "./SelectedUploadCard.tsx";

const meta = {
  component: SelectedUploadCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Inset summary row after a file is chosen: lead (icon or thumbnail), title, optional subtitle, actions.",
      },
    },
  },
} satisfies Meta<typeof SelectedUploadCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithFileMeta = {
  args: {
    leading: (
      <IconTile variant="muted">
        <FileText aria-hidden />
      </IconTile>
    ),
    title: "statement-march-2025.csv",
    subtitle: "128 KB",
    actions: (
      <Button type="button" variant="outline" size="sm">
        Replace file
      </Button>
    ),
  },
} satisfies Story;

export const ImagePreview = {
  args: {
    leading: (
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-background">
        <img
          src="https://picsum.photos/seed/logo/80/80"
          alt=""
          className="max-h-full max-w-full object-contain"
        />
      </div>
    ),
    title: "Current logo",
    actions: (
      <>
        <Button type="button" variant="outline" size="sm">
          Replace
        </Button>
        <Button type="button" variant="ghost" size="sm">
          Remove
        </Button>
      </>
    ),
  },
} satisfies Story;
