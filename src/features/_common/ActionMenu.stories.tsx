import {
  ActionMenu,
  type ActionMenuProps,
  ActionMenuCopyItem,
  ActionMenuDeleteItem,
  ActionMenuDuplicateItem,
  ActionMenuEditItem,
  ActionMenuMarkPaidMenuItem,
} from "@/features/_common/ActionMenu.tsx";
import { FixedMeta } from "@/platform/storybook/FixedMeta.ts";
import { createStaticAccessor } from "@/services/_common/createStaticAccessor.ts";
import { createPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.mock.ts";
import { createMutationService } from "@/services/io/MutationService/MutationService.mock.ts";
import type { StoryObj } from "@storybook/react-vite";

const onAction = createStaticAccessor<(name: string, ...args: unknown[]) => void>(
  () => {},
);

const preference = (dangerMode: boolean) =>
  createPreferenceService({
    dangerMode: createStaticAccessor(dangerMode),
    onAction,
  });

const standardItems = (
  <>
    <ActionMenuEditItem>Edit</ActionMenuEditItem>
    <ActionMenuDuplicateItem>Duplicate</ActionMenuDuplicateItem>
    <ActionMenuCopyItem copyText="billing-demo-42">Copy ID</ActionMenuCopyItem>
    <ActionMenuDeleteItem>Delete</ActionMenuDeleteItem>
  </>
);

type Args = ActionMenuProps;

const meta = {
  component: ActionMenu,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Row “⋯” actions menu. Delete stays disabled until **danger mode** is on in preferences. `ActionMenuMarkPaidMenuItem` needs `mutationService`.",
      },
    },
  },
  args: {
    services: {
      preferenceService: preference(false),
    },
    children: standardItems,
  },
} satisfies FixedMeta<Args>;

export default meta;

type Story = StoryObj<Args>;

export const Default = {} satisfies Story;

export const DangerModeEnabled = {
  args: {
    services: {
      preferenceService: preference(true),
    },
  },
} satisfies Story;

export const WithMarkAsPaid = {
  args: {
    services: {
      preferenceService: preference(false),
    },
    children: (
      <>
        {standardItems}
        <ActionMenuMarkPaidMenuItem
          billingId={1}
          paidAt={null}
          services={{ mutationService: createMutationService(onAction) }}
        >
          Mark as paid
        </ActionMenuMarkPaidMenuItem>
      </>
    ),
  },
} satisfies Story;
