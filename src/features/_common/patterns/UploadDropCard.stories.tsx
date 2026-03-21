import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button.tsx";
import { FileText, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { useId, useState } from "react";

import { FileDropEmptyState } from "./FileDropEmptyState.tsx";
import { IconTile } from "./IconTile.tsx";
import { SelectedUploadCard } from "./SelectedUploadCard.tsx";
import { UploadDropCard } from "./UploadDropCard.tsx";

const meta = {
  component: UploadDropCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Framed upload block: accent icon + title/description, then empty drop state or selected file card inside.",
      },
    },
  },
} satisfies Meta<typeof UploadDropCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EmptyBankExport = {
  args: {
    icon: <Upload aria-hidden />,
    title: "Bank export",
    description:
      "Drop your file or browse — no need to clean or edit the file first.",
    children: null,
  },
  render: function EmptyBankExportRender({ icon, title, description }) {
    const id = useId();
    return (
      <div className="mx-auto max-w-xl">
        <UploadDropCard icon={icon} title={title} description={description}>
          <input id={id} type="file" className="sr-only" />
          <FileDropEmptyState
            inputId={id}
            title="Choose a bank file"
            description="CSV, PDF, or TXT — same as from your bank"
          />
        </UploadDropCard>
      </div>
    );
  },
} satisfies Story;

function WithSelectedFileStory({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  const id = useId();
  const [hasFile, setHasFile] = useState(true);
  return (
    <div className="mx-auto max-w-xl">
      <UploadDropCard icon={icon} title={title} description={description}>
        <input
          id={id}
          type="file"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.[0]) setHasFile(true);
          }}
        />
        {hasFile ? (
          <SelectedUploadCard
            leading={
              <IconTile variant="muted">
                <FileText aria-hidden />
              </IconTile>
            }
            title="export.csv"
            subtitle="42 KB"
            actions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHasFile(false)}
              >
                Replace file
              </Button>
            }
          />
        ) : (
          <FileDropEmptyState
            inputId={id}
            title="Choose a bank file"
            description="CSV, PDF, or TXT — same as from your bank"
          />
        )}
      </UploadDropCard>
    </div>
  );
}

export const WithSelectedFile = {
  args: {
    icon: <Upload aria-hidden />,
    title: "Bank export",
    description:
      "Drop your file or browse — no need to clean or edit the file first.",
    children: null,
  },
  render: function WithSelectedFileRender({ icon, title, description }) {
    return (
      <WithSelectedFileStory
        icon={icon}
        title={title}
        description={description}
      />
    );
  },
} satisfies Story;
