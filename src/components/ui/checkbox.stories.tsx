import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "./checkbox";
import { Label } from "./label";
import { CheckboxWithLabel } from "./checkbox";
import { useState } from "react";

const meta = {
  component: Checkbox,
} satisfies Meta<typeof Checkbox>;

export default meta;

export const Default = {
  render: (props) => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" {...props} />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const States = {
  render: (props) => (
    <div className="space-y-4 p-4">
      <div className="flex items-center space-x-2">
        <Checkbox id="unchecked" {...props} />
        <Label htmlFor="unchecked">Unchecked</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="checked" checked {...props} />
        <Label htmlFor="checked">Checked</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="indeterminate" checked="indeterminate" {...props} />
        <Label htmlFor="indeterminate">Indeterminate</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="disabled" disabled {...props} />
        <Label htmlFor="disabled">Disabled</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="disabled-checked" disabled checked {...props} />
        <Label htmlFor="disabled-checked">Disabled Checked</Label>
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const WithLabels = {
  render: (props) => (
    <div className="space-y-4 p-4">
      <div className="flex items-center space-x-2">
        <Checkbox id="newsletter" {...props} />
        <Label htmlFor="newsletter">Subscribe to newsletter</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="notifications" {...props} />
        <Label htmlFor="notifications">Email notifications</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="marketing" {...props} />
        <Label htmlFor="marketing">Marketing emails</Label>
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const FormExample = {
  render: (props) => (
    <div className="space-y-6 p-4 max-w-md">
      <div>
        <h3 className="text-lg font-semibold mb-4">Preferences</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox id="dark-mode" {...props} />
            <Label htmlFor="dark-mode">Dark mode</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="notifications" {...props} />
            <Label htmlFor="notifications">Push notifications</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="analytics" {...props} />
            <Label htmlFor="analytics">Analytics tracking</Label>
          </div>
        </div>
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const CheckboxGroup = {
  render: (props) => (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-semibold">Select your interests</h3>
      <div className="space-y-2">
        {[
          "Technology",
          "Design",
          "Business",
          "Marketing",
          "Science",
          "Arts",
        ].map((interest) => (
          <div key={interest} className="flex items-center space-x-2">
            <Checkbox id={interest.toLowerCase()} {...props} />
            <Label htmlFor={interest.toLowerCase()}>{interest}</Label>
          </div>
        ))}
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

// CheckboxWithLabel Stories
export const WithLabelDefault = {
  render: () => (
    <div className="w-80">
      <CheckboxWithLabel
        id="default"
        checked={false}
        onCheckedChange={() => {}}
        title="Enable notifications"
        description="You can enable or disable notifications at any time."
      />
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const WithLabelChecked = {
  render: () => (
    <div className="w-80">
      <CheckboxWithLabel
        id="checked"
        checked={true}
        onCheckedChange={() => {}}
        title="Enable notifications"
        description="You can enable or disable notifications at any time."
      />
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const WithLabelStates = {
  render: () => (
    <div className="space-y-4 w-80">
      <CheckboxWithLabel
        id="unchecked"
        checked={false}
        onCheckedChange={() => {}}
        title="Unchecked"
        description="This checkbox is not selected."
      />
      <CheckboxWithLabel
        id="checked"
        checked={true}
        onCheckedChange={() => {}}
        title="Checked"
        description="This checkbox is selected."
      />
      <CheckboxWithLabel
        id="disabled"
        checked={false}
        onCheckedChange={() => {}}
        title="Disabled"
        description="This checkbox is disabled."
        disabled
      />
      <CheckboxWithLabel
        id="disabled-checked"
        checked={true}
        onCheckedChange={() => {}}
        title="Disabled Checked"
        description="This checkbox is disabled and checked."
        disabled
      />
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const WithLabelInteractive = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return (
      <div className="w-80">
        <CheckboxWithLabel
          id="interactive"
          checked={checked}
          onCheckedChange={setChecked}
          title="Interactive checkbox"
          description="Click to toggle this checkbox and see the state change."
        />
        <div className="mt-4 p-3 bg-slate-100 rounded-lg">
          <p className="text-sm">
            <strong>Current state:</strong> {checked ? "Checked" : "Unchecked"}
          </p>
        </div>
      </div>
    );
  },
} satisfies StoryObj<typeof meta>;

export const WithLabelFormExample = {
  render: () => {
    const [preferences, setPreferences] = useState({
      notifications: false,
      darkMode: true,
      analytics: false,
      marketing: false,
    });

    const handleChange =
      (key: keyof typeof preferences) => (checked: boolean) => {
        setPreferences((prev) => ({ ...prev, [key]: checked }));
      };

    return (
      <div className="space-y-4 w-80">
        <h3 className="text-lg font-semibold">User Preferences</h3>
        <CheckboxWithLabel
          id="notifications"
          checked={preferences.notifications}
          onCheckedChange={handleChange("notifications")}
          title="Push notifications"
          description="Receive push notifications for important updates."
        />
        <CheckboxWithLabel
          id="dark-mode"
          checked={preferences.darkMode}
          onCheckedChange={handleChange("darkMode")}
          title="Dark mode"
          description="Use dark theme for better viewing in low light."
        />
        <CheckboxWithLabel
          id="analytics"
          checked={preferences.analytics}
          onCheckedChange={handleChange("analytics")}
          title="Analytics tracking"
          description="Help us improve by sharing anonymous usage data."
        />
        <CheckboxWithLabel
          id="marketing"
          checked={preferences.marketing}
          onCheckedChange={handleChange("marketing")}
          title="Marketing emails"
          description="Receive updates about new features and promotions."
        />
        <div className="mt-4 p-3 bg-slate-100 rounded-lg">
          <p className="text-sm font-medium mb-2">Current preferences:</p>
          <pre className="text-xs text-slate-600">
            {JSON.stringify(preferences, null, 2)}
          </pre>
        </div>
      </div>
    );
  },
} satisfies StoryObj<typeof meta>;

export const WithLabelExportBuilderExample = {
  render: () => {
    const [config, setConfig] = useState({
      flattening: {
        enabled: true,
        dimensions: ["date"],
      },
      dimensions: ["project", "task", "contractor"],
      measures: ["hours", "billing"],
    });

    const handleFlatteningChange = (checked: boolean) => {
      setConfig((prev) => ({
        ...prev,
        flattening: { ...prev.flattening, enabled: checked },
      }));
    };

    const handleDimensionChange = (dimension: string) => (checked: boolean) => {
      setConfig((prev) => ({
        ...prev,
        dimensions: checked
          ? [...prev.dimensions, dimension]
          : prev.dimensions.filter((d) => d !== dimension),
      }));
    };

    const handleMeasureChange = (measure: string) => (checked: boolean) => {
      setConfig((prev) => ({
        ...prev,
        measures: checked
          ? [...prev.measures, measure]
          : prev.measures.filter((m) => m !== measure),
      }));
    };

    return (
      <div className="space-y-6 w-96">
        <h3 className="text-lg font-semibold">Export Builder Configuration</h3>

        <div className="space-y-4">
          <h4 className="font-medium">Data Flattening</h4>
          <CheckboxWithLabel
            id="flattening"
            checked={config.flattening.enabled}
            onCheckedChange={handleFlatteningChange}
            title="Enable data flattening"
            description="Flatten data for pre-aggregation (e.g., merge daily entries)"
          />
        </div>

        <div className="space-y-4">
          <h4 className="font-medium">Dimensions</h4>
          {["project", "task", "contractor", "activity", "date"].map(
            (dimension) => (
              <CheckboxWithLabel
                key={dimension}
                id={`dimension-${dimension}`}
                checked={config.dimensions.includes(dimension)}
                onCheckedChange={handleDimensionChange(dimension)}
                title={dimension.charAt(0).toUpperCase() + dimension.slice(1)}
                description={`Include ${dimension} in export`}
              />
            ),
          )}
        </div>

        <div className="space-y-4">
          <h4 className="font-medium">Measures</h4>
          {["hours", "billing", "cost"].map((measure) => (
            <CheckboxWithLabel
              key={measure}
              id={`measure-${measure}`}
              checked={config.measures.includes(measure)}
              onCheckedChange={handleMeasureChange(measure)}
              title={measure.charAt(0).toUpperCase() + measure.slice(1)}
              description={`Include ${measure} in export`}
            />
          ))}
        </div>

        <div className="mt-4 p-3 bg-slate-100 rounded-lg">
          <p className="text-sm font-medium mb-2">Current configuration:</p>
          <pre className="text-xs text-slate-600">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      </div>
    );
  },
} satisfies StoryObj<typeof meta>;

export const WithLabelLongContent = {
  render: () => (
    <div className="w-96">
      <CheckboxWithLabel
        id="long-content"
        checked={false}
        onCheckedChange={() => {}}
        title="This is a very long title that might wrap to multiple lines and should be handled gracefully"
        description="This is a very long description that contains multiple sentences and should demonstrate how the component handles longer content. It should wrap properly and maintain good spacing and readability even with extensive text content."
      />
    </div>
  ),
} satisfies StoryObj<typeof meta>;
