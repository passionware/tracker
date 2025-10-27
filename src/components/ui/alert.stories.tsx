import type { Meta, StoryObj } from "@storybook/react-vite";
import { AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./alert";

const meta = {
  component: Alert,
} satisfies Meta<typeof Alert>;

export default meta;

export const Default = {
  render: (props) => (
    <Alert {...props}>
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You can add components to your app using the cli.
      </AlertDescription>
    </Alert>
  ),
} satisfies StoryObj<typeof meta>;

export const Variants = {
  render: (props) => {
    const variants = ["default", "info", "destructive"] as const;

    return (
      <div className="space-y-4 p-4">
        {variants.map((variant) => (
          <Alert key={variant} variant={variant} {...props}>
            <AlertTitle>
              {variant === "default" && "Default Alert"}
              {variant === "info" && "Information"}
              {variant === "destructive" && "Error"}
            </AlertTitle>
            <AlertDescription>
              This is a {variant} alert with some important information.
            </AlertDescription>
          </Alert>
        ))}
      </div>
    );
  },
} satisfies StoryObj<typeof meta>;

export const WithIcons = {
  render: (props) => (
    <div className="space-y-4 p-4">
      <Alert variant="default" {...props}>
        <Info className="h-4 w-4" />
        <AlertTitle>Information</AlertTitle>
        <AlertDescription>
          This is a default alert with an info icon.
        </AlertDescription>
      </Alert>

      <Alert variant="info" {...props}>
        <Info className="h-4 w-4" />
        <AlertTitle>Success</AlertTitle>
        <AlertDescription>
          Your changes have been saved successfully.
        </AlertDescription>
      </Alert>

      <Alert variant="destructive" {...props}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Your session has expired. Please log in again.
        </AlertDescription>
      </Alert>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const WithoutTitle = {
  render: (props) => (
    <div className="space-y-4 p-4">
      <Alert variant="default" {...props}>
        <AlertDescription>This is an alert without a title.</AlertDescription>
      </Alert>

      <Alert variant="info" {...props}>
        <AlertDescription>
          This is an info alert without a title.
        </AlertDescription>
      </Alert>

      <Alert variant="destructive" {...props}>
        <AlertDescription>
          This is a destructive alert without a title.
        </AlertDescription>
      </Alert>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const LongContent = {
  render: (props) => (
    <Alert {...props}>
      <AlertTitle>Important System Update</AlertTitle>
      <AlertDescription>
        We will be performing scheduled maintenance on our servers from 2:00 AM
        to 4:00 AM EST on Sunday, January 15th. During this time, some features
        may be temporarily unavailable. We apologize for any inconvenience this
        may cause and appreciate your patience.
      </AlertDescription>
    </Alert>
  ),
} satisfies StoryObj<typeof meta>;
