import { workspaceMock } from "@/api/workspace/workspace.mock.ts";
import {
  ArgsWithServices,
  createSbServices,
} from "@/services/_common/createSbServices.ts";
import type { Meta, StoryObj } from "@storybook/react";

import { WorkspacePicker, WorkspacePickerProps } from "../pickers/WorkspacePicker.tsx";

const ser = createSbServices({
  workspace: true,
});
type Args = ArgsWithServices<WorkspacePickerProps, typeof ser>;

const meta = {
  decorators: [ser.decorator.argsDecorator],
  args: {
    ...ser.args,
  },
  component: WorkspacePicker,
} satisfies Meta<Args>;

export default meta;

type Story = StoryObj<Args>;

export const Default = {} satisfies Story;

export const WithValue = {
  args: {
    value: workspaceMock.static.list[0].id,
  },
} satisfies Story;

export const Disabled = {
  args: {
    ...WithValue.args,
    disabled: true,
  },
} satisfies Story;

export const DisableNoValue = {
  args: {
    disabled: true,
    value: undefined,
  },
} satisfies Story;

export const DifferentSizes = {
  args: {
    ...WithValue.args,
  },
  render: (props) => (
    <div className="grid grid-cols-3 gap-10 max-w-lg">
      <WorkspacePicker {...props} value={undefined} size="xs" />
      <WorkspacePicker {...props} size="xs" />
      <WorkspacePicker
        {...props}
        value={workspaceMock.static.list[3].id}
        size="xs"
      />
      <WorkspacePicker {...props} value={undefined} size="sm" />
      <WorkspacePicker {...props} size="sm" />
      <WorkspacePicker
        {...props}
        value={workspaceMock.static.list[3].id}
        size="sm"
      />
      <WorkspacePicker {...props} value={undefined} size="md" />
      <WorkspacePicker {...props} size="md" />
      <WorkspacePicker
        {...props}
        value={workspaceMock.static.list[3].id}
        size="md"
      />
      <WorkspacePicker {...props} value={undefined} size="lg" />
      <WorkspacePicker {...props} size="lg" />
      <WorkspacePicker
        {...props}
        value={workspaceMock.static.list[3].id}
        size="lg"
      />
    </div>
  ),
} satisfies Story;
