import type { Meta, StoryObj } from "@storybook/react-vite";

import { AiLoadingOverlay } from "./AiLoadingOverlay.tsx";

const meta = {
  title: "Common/Patterns/AiLoadingOverlay",
  component: AiLoadingOverlay,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Full-bleed overlay for long-running AI tasks. Absolutely positioned—wrap in a `relative` container with explicit size. Match host radius via `clipClassName`.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-[min(560px,90vh)] items-center justify-center bg-muted/40 p-8">
        <div className="relative h-[420px] w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
          <div className="absolute inset-0 p-6">
            <p className="text-sm text-muted-foreground">
              Background content stays visible but blurred beneath the overlay.
            </p>
          </div>
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof AiLoadingOverlay>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {
  args: {
    title: "Analyzing your file",
    description:
      "We are extracting structure and matching rows to your workspace. You can keep this panel open—progress is shown below.",
    footerHint: "Usually under a minute",
  },
} satisfies Story;

export const WithFileName = {
  args: {
    title: "Matching payments",
    description:
      "Comparing statement lines with open invoices and historical payments.",
    fileName: "statement_2025-03-import.csv",
    footerHint: "Safe to navigate away; we will resume when you return",
  },
} satisfies Story;

export const RichDescription = {
  args: {
    title: "Generating suggestions",
    description: (
      <>
        <span className="font-medium text-foreground/90">
          Tip:
        </span>{" "}
        Larger imports run faster when date columns are unambiguous (ISO
        <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono text-[0.7rem]">
          YYYY-MM-DD
        </code>
        preferred).
      </>
    ),
    fileName: null,
    footerHint: "Queued behind 1 other job",
  },
} satisfies Story;

export const DrawerRadius = {
  args: {
    title: "Preparing preview",
    description: "Align clip radius with drawer content when embedding.",
    footerHint: "Almost done",
    clipClassName: "rounded-l-3xl",
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-[min(560px,90vh)] items-center justify-center bg-muted/40 p-8">
        <div className="relative h-[420px] w-full max-w-xl overflow-hidden rounded-r-2xl rounded-l-3xl border border-border bg-background shadow-sm">
          <div className="absolute inset-0 p-6">
            <p className="text-sm text-muted-foreground">
              Simulated drawer: left side uses a larger radius; overlay should
              match via <code className="rounded bg-muted px-1 py-0.5 text-xs">clipClassName</code>.
            </p>
          </div>
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Story;
