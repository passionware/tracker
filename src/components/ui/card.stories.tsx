import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./badge";
import { Button } from "./button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

const meta = {
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;

export const Default = {
  render: (props) => (
    <Card className="w-80" {...props}>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card Content</p>
      </CardContent>
      <CardFooter>
        <p>Card Footer</p>
      </CardFooter>
    </Card>
  ),
} satisfies StoryObj<typeof meta>;

export const Simple = {
  render: (props) => (
    <Card className="w-80" {...props}>
      <CardContent className="p-6">
        <p>This is a simple card with just content.</p>
      </CardContent>
    </Card>
  ),
} satisfies StoryObj<typeof meta>;

export const WithHeader = {
  render: (props) => (
    <Card className="w-80" {...props}>
      <CardHeader>
        <CardTitle>Project Dashboard</CardTitle>
        <CardDescription>
          Overview of your current projects and their status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Active Projects</span>
            <Badge variant="positive">3</Badge>
          </div>
          <div className="flex justify-between">
            <span>Completed</span>
            <Badge variant="secondary">12</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
} satisfies StoryObj<typeof meta>;

export const WithActions = {
  render: (props) => (
    <Card className="w-80" {...props}>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>
          Manage your account settings and preferences.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>
          Configure your notification preferences, privacy settings, and more.
        </p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Save Changes</Button>
      </CardFooter>
    </Card>
  ),
} satisfies StoryObj<typeof meta>;

export const ProductCard = {
  render: (props) => (
    <Card className="w-80" {...props}>
      <CardHeader>
        <div className="aspect-video bg-slate-100 rounded-md mb-4"></div>
        <CardTitle>Premium Plan</CardTitle>
        <CardDescription>
          Get access to all premium features and priority support.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold">$29/month</div>
          <ul className="text-sm space-y-1">
            <li>• Unlimited projects</li>
            <li>• Priority support</li>
            <li>• Advanced analytics</li>
            <li>• Custom integrations</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Get Started</Button>
      </CardFooter>
    </Card>
  ),
} satisfies StoryObj<typeof meta>;

export const StatsCard = {
  render: (props) => (
    <div className="grid grid-cols-3 gap-4 p-4">
      <Card {...props}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">$45,231.89</div>
          <p className="text-xs text-muted-foreground">
            +20.1% from last month
          </p>
        </CardContent>
      </Card>
      <Card {...props}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+2350</div>
          <p className="text-xs text-muted-foreground">
            +180.1% from last month
          </p>
        </CardContent>
      </Card>
      <Card {...props}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+12,234</div>
          <p className="text-xs text-muted-foreground">+19% from last month</p>
        </CardContent>
      </Card>
    </div>
  ),
} satisfies StoryObj<typeof meta>;
