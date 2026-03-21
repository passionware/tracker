import type { Meta, StoryObj } from "@storybook/react-vite";
import { ImageIcon } from "lucide-react";
import { useId } from "react";

import { FileDropEmptyState } from "./FileDropEmptyState.tsx";

const meta = {
  component: FileDropEmptyState,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Dashed drop / browse target as a label for a hidden file input. Pair with `UploadDropCard` or use standalone.",
      },
    },
  },
} satisfies Meta<typeof FileDropEmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {
  args: {
    inputId: "story-file-drop",
    title: "Choose a file",
    description: "CSV, PDF, or plain text",
  },
  render: function DefaultRender(args) {
    const id = useId();
    return (
      <div className="flex h-[min(52vh,420px)] w-full max-w-md flex-col">
        <input id={id} type="file" className="sr-only" />
        <FileDropEmptyState
          {...args}
          inputId={id}
        />
      </div>
    );
  },
} satisfies Story;

export const CustomIcon = {
  args: {
    inputId: "story-file-drop-image",
    title: "Add an image",
    description: "PNG or JPG",
    icon: <ImageIcon className="mb-3 size-10" aria-hidden />,
  },
  render: function CustomIconRender(args) {
    const id = useId();
    return (
      <div className="flex h-[280px] w-full max-w-md flex-col">
        <input id={id} type="file" accept="image/*" className="sr-only" />
        <FileDropEmptyState {...args} inputId={id} />
      </div>
    );
  },
} satisfies Story;
