import type { Meta, StoryObj } from "@storybook/react-vite";
import { Label } from "./label";
import { Switch } from "./switch";

const meta = {
  component: Switch,
} satisfies Meta<typeof Switch>;

export default meta;

export const Default = {
  render: (props) => (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" {...props} />
      <Label htmlFor="airplane-mode">Airplane mode</Label>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const Variants = {
  render: (props) => (
    <div className="space-y-4 p-4">
      <div className="flex items-center space-x-2">
        <Switch id="normal" variant="normal" {...props} />
        <Label htmlFor="normal">Normal Switch</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="danger" variant="danger" {...props} />
        <Label htmlFor="danger">Danger Switch</Label>
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const States = {
  render: (props) => (
    <div className="space-y-4 p-4">
      <div className="flex items-center space-x-2">
        <Switch id="unchecked" {...props} />
        <Label htmlFor="unchecked">Unchecked</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="checked" checked {...props} />
        <Label htmlFor="checked">Checked</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="disabled" disabled {...props} />
        <Label htmlFor="disabled">Disabled</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="disabled-checked" disabled checked {...props} />
        <Label htmlFor="disabled-checked">Disabled Checked</Label>
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const SettingsExample = {
  render: (props) => (
    <div className="space-y-6 p-4 max-w-md">
      <div>
        <h3 className="text-lg font-semibold mb-4">Notification Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email notifications</Label>
              <p className="text-sm text-gray-500">
                Receive emails about your account activity
              </p>
            </div>
            <Switch id="email-notifications" {...props} />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifications">Push notifications</Label>
              <p className="text-sm text-gray-500">
                Receive push notifications on your device
              </p>
            </div>
            <Switch id="push-notifications" checked {...props} />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-notifications">SMS notifications</Label>
              <p className="text-sm text-gray-500">
                Receive text messages for important updates
              </p>
            </div>
            <Switch id="sms-notifications" {...props} />
          </div>
        </div>
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const WithDescriptions = {
  render: (props) => (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="dark-mode">Dark mode</Label>
          <p className="text-sm text-gray-500">
            Switch between light and dark themes
          </p>
        </div>
        <Switch id="dark-mode" {...props} />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="auto-save">Auto-save</Label>
          <p className="text-sm text-gray-500">
            Automatically save your work as you type
          </p>
        </div>
        <Switch id="auto-save" checked {...props} />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="analytics">Analytics</Label>
          <p className="text-sm text-gray-500">
            Help us improve by sharing anonymous usage data
          </p>
        </div>
        <Switch id="analytics" {...props} />
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;
