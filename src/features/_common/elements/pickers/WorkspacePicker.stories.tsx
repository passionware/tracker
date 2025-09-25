import { unassignedUtils } from "@/api/_common/query/filters/Unassigned.ts";
import { workspaceMock } from "@/api/workspace/workspace.mock.ts";
import { FixedMeta } from "@/platform/storybook/FixedMeta.ts";
import {
  ArgsWithServices,
  createSbServices,
} from "@/services/_common/createSbServices.ts";
import type { StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";

import { WorkspacePicker, WorkspacePickerProps } from "./WorkspacePicker.tsx";

const ser = createSbServices({
  workspace: true,
});
type Args = ArgsWithServices<WorkspacePickerProps, typeof ser>;

const meta = {
  decorators: [ser.decorator.argsDecorator],
  args: {
    ...ser.args,
    value: undefined,
  },
  component: WorkspacePicker,
} satisfies FixedMeta<Args>;

export default meta;

type Story = StoryObj<Args>;

export const Default = {} satisfies Story;

export const WithValue = {
  args: {
    value: workspaceMock.static.list[0].id,
  },
} satisfies Story;

export const Unassigned = {
  args: {
    ...WithValue.args,
    value: unassignedUtils.ofUnassigned(),
    allowUnassigned: true,
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
    <div className="grid grid-cols-4 gap-10 max-w-3xl">
      {(["xs", "sm", "md", "lg"] as const).map((size) => (
        <Fragment key={size}>
          <WorkspacePicker {...props} value={undefined} size={size} />
          <WorkspacePicker
            {...props}
            value={unassignedUtils.ofUnassigned()}
            size={size}
          />
          <WorkspacePicker {...props} size={size} />
          <WorkspacePicker
            {...props}
            value={workspaceMock.static.list[3].id}
            size={size}
          />
        </Fragment>
      ))}
    </div>
  ),
} satisfies Story;

export const AllowingUnassigned = {
  args: {
    ...WithValue.args,
    allowUnassigned: true,
  },
} satisfies Story;

export const AllowingClear = {
  args: {
    ...WithValue.args,
    allowClear: true,
  },
} satisfies Story;
