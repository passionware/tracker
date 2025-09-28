import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta = {
  component: Tabs,
  args: {
    defaultValue: "account",
  },
} satisfies Meta<typeof Tabs>;

export default meta;

export const Default = {
  render: (props) => (
    <Tabs {...props} className="w-full">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Account Settings</h3>
          <p className="text-sm text-gray-600">
            Manage your account settings and preferences.
          </p>
        </div>
      </TabsContent>
      <TabsContent value="password">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Password Settings</h3>
          <p className="text-sm text-gray-600">
            Update your password and security settings.
          </p>
        </div>
      </TabsContent>
      <TabsContent value="billing">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Billing Information</h3>
          <p className="text-sm text-gray-600">
            Manage your billing and subscription details.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  ),
} satisfies StoryObj<typeof meta>;

export const WithIcons = {
  render: (props) => (
    <Tabs {...props} className="w-full">
      <TabsList>
        <TabsTrigger value="dashboard">
          <span className="mr-2">📊</span>
          Dashboard
        </TabsTrigger>
        <TabsTrigger value="analytics">
          <span className="mr-2">📈</span>
          Analytics
        </TabsTrigger>
        <TabsTrigger value="reports">
          <span className="mr-2">📋</span>
          Reports
        </TabsTrigger>
      </TabsList>
      <TabsContent value="dashboard">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Dashboard</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-100 rounded">Metric 1</div>
            <div className="p-4 bg-gray-100 rounded">Metric 2</div>
            <div className="p-4 bg-gray-100 rounded">Metric 3</div>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="analytics">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Analytics</h3>
          <p className="text-sm text-gray-600">
            View detailed analytics and performance metrics.
          </p>
        </div>
      </TabsContent>
      <TabsContent value="reports">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Reports</h3>
          <p className="text-sm text-gray-600">
            Generate and download various reports.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  ),
} satisfies StoryObj<typeof meta>;

export const Vertical = {
  render: (props) => (
    <Tabs {...props} className="w-full" orientation="vertical">
      <div className="flex">
        <TabsList className="flex-col h-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <div className="ml-4 flex-1">
          <TabsContent value="profile">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Profile</h3>
              <p className="text-sm text-gray-600">
                Manage your profile information.
              </p>
            </div>
          </TabsContent>
          <TabsContent value="settings">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Settings</h3>
              <p className="text-sm text-gray-600">
                Configure your application settings.
              </p>
            </div>
          </TabsContent>
          <TabsContent value="notifications">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Notifications</h3>
              <p className="text-sm text-gray-600">
                Control your notification preferences.
              </p>
            </div>
          </TabsContent>
        </div>
      </div>
    </Tabs>
  ),
} satisfies StoryObj<typeof meta>;

export const WithBadges = {
  render: (props) => (
    <Tabs {...props} className="w-full">
      <TabsList>
        <TabsTrigger value="inbox">
          Inbox
          <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
            3
          </span>
        </TabsTrigger>
        <TabsTrigger value="sent">
          Sent
          <span className="ml-2 bg-gray-500 text-white text-xs px-2 py-1 rounded-full">
            12
          </span>
        </TabsTrigger>
        <TabsTrigger value="drafts">
          Drafts
          <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
            1
          </span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="inbox">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Inbox</h3>
          <p className="text-sm text-gray-600">You have 3 unread messages.</p>
        </div>
      </TabsContent>
      <TabsContent value="sent">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Sent</h3>
          <p className="text-sm text-gray-600">View your sent messages.</p>
        </div>
      </TabsContent>
      <TabsContent value="drafts">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Drafts</h3>
          <p className="text-sm text-gray-600">You have 1 draft message.</p>
        </div>
      </TabsContent>
    </Tabs>
  ),
} satisfies StoryObj<typeof meta>;
