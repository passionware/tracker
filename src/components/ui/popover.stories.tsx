import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "./popover";

const meta = {
  component: Popover,
} satisfies Meta<typeof Popover>;

export default meta;

export const Default = {
  render: (props) => (
    <Popover {...props}>
      <PopoverTrigger asChild>
        <Button>Open popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>Popover Title</PopoverHeader>
        <p className="text-sm text-gray-600">
          This is the popover content. It can contain any React elements.
        </p>
      </PopoverContent>
    </Popover>
  ),
} satisfies StoryObj<typeof meta>;

export const WithForm = {
  render: (props) => (
    <Popover {...props}>
      <PopoverTrigger asChild>
        <Button>Settings</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>Settings</PopoverHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <input
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Enter your name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Enter your email"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" size="sm">
              Cancel
            </Button>
            <Button size="sm">Save</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
} satisfies StoryObj<typeof meta>;

export const WithList = {
  render: (props) => (
    <Popover {...props}>
      <PopoverTrigger asChild>
        <Button>Actions</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>Actions</PopoverHeader>
        <div className="space-y-1">
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">
            Edit
          </button>
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">
            Duplicate
          </button>
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">
            Share
          </button>
          <hr className="my-1" />
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded text-red-600">
            Delete
          </button>
        </div>
      </PopoverContent>
    </Popover>
  ),
} satisfies StoryObj<typeof meta>;

export const WithContent = {
  render: (props) => (
    <Popover {...props}>
      <PopoverTrigger asChild>
        <Button>Info</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>Information</PopoverHeader>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm">Status: Online</span>
          </div>
          <div className="text-sm text-gray-600">
            <p>Last seen: 2 minutes ago</p>
            <p>Location: New York, NY</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
} satisfies StoryObj<typeof meta>;

export const WithoutHeader = {
  render: (props) => (
    <Popover {...props}>
      <PopoverTrigger asChild>
        <Button>Simple popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <p className="text-sm text-gray-600">
          This popover doesn't have a header.
        </p>
      </PopoverContent>
    </Popover>
  ),
} satisfies StoryObj<typeof meta>;

export const MultiplePopovers = {
  render: (props) => (
    <div className="flex gap-4 p-4">
      <Popover {...props}>
        <PopoverTrigger asChild>
          <Button variant="outline">User</Button>
        </PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>User Profile</PopoverHeader>
          <div className="space-y-2">
            <p className="text-sm">
              <strong>Name:</strong> John Doe
            </p>
            <p className="text-sm">
              <strong>Email:</strong> john@example.com
            </p>
            <p className="text-sm">
              <strong>Role:</strong> Administrator
            </p>
          </div>
        </PopoverContent>
      </Popover>

      <Popover {...props}>
        <PopoverTrigger asChild>
          <Button variant="outline">Settings</Button>
        </PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>Settings</PopoverHeader>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input type="checkbox" />
              <span className="text-sm">Notifications</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" />
              <span className="text-sm">Dark mode</span>
            </label>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  ),
} satisfies StoryObj<typeof meta>;
