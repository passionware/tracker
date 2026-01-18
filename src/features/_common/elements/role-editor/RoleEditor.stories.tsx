import { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { RoleEditor } from "./RoleEditor";
import {
  ProjectDefinition,
  ContractorDefinition,
  TaskTypeDefinition,
  ActivityTypeDefinition,
  RoleRateWithContractor,
} from "./RoleEditor";

const meta: Meta<typeof RoleEditor> = {
  title: "UI/RoleEditor",
  component: RoleEditor,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof RoleEditor>;

// Sample data
const sampleProjects: ProjectDefinition[] = [
  { id: "proj1", label: "Project Alpha" },
  { id: "proj2", label: "Project Beta" },
  { id: "proj3", label: "Project Gamma" },
];

const sampleTaskTypes: TaskTypeDefinition[] = [
  { id: "task1", label: "User management cockpit" },
  { id: "task2", label: "New Gallery System" },
  { id: "task3", label: "Voting System" },
];

const sampleActivityTypes: ActivityTypeDefinition[] = [
  { id: "activity1", label: "Development" },
  { id: "activity2", label: "Code Review" },
  { id: "activity3", label: "Meeting" },
];

const sampleContractors: ContractorDefinition[] = [
  { id: "contractor1", label: "John Doe" },
  { id: "contractor2", label: "Jane Smith" },
  { id: "contractor3", label: "Bob Johnson" },
];

const sampleRoleRates: RoleRateWithContractor[] = [
  {
    contractorId: "contractor1",
    rate: {
      billing: "hourly",
      activityTypes: ["activity1"],
      taskTypes: ["task1"],
      projectIds: ["proj1", "proj2"],
      costRate: 50,
      costCurrency: "EUR",
      billingRate: 75,
      billingCurrency: "EUR",
    },
  },
  {
    contractorId: "contractor2",
    rate: {
      billing: "hourly",
      activityTypes: ["activity2"],
      taskTypes: ["task2"],
      projectIds: ["proj1"],
      costRate: 60,
      costCurrency: "USD",
      billingRate: 90,
      billingCurrency: "USD",
    },
  },
];

export const Empty: Story = {
  args: {
    projects: sampleProjects,
    contractors: sampleContractors,
    roleRates: [],
    onChange: (roleRates) => console.log("Role rates changed:", roleRates),
    showProjects: true,
    showTaskTypes: false,
    showActivityTypes: false,
  },
};

export const WithRates: Story = {
  args: {
    projects: sampleProjects,
    contractors: sampleContractors,
    roleRates: sampleRoleRates,
    onChange: (roleRates) => console.log("Role rates changed:", roleRates),
    showProjects: true,
    showTaskTypes: false,
    showActivityTypes: false,
  },
};

export const WithTaskAndActivityTypes: Story = {
  args: {
    projects: sampleProjects,
    taskTypes: sampleTaskTypes,
    activityTypes: sampleActivityTypes,
    contractors: sampleContractors,
    roleRates: sampleRoleRates,
    onChange: (roleRates) => console.log("Role rates changed:", roleRates),
    showProjects: true,
    showTaskTypes: true,
    showActivityTypes: true,
  },
};

export const SingleContractor: Story = {
  args: {
    projects: sampleProjects,
    contractors: [sampleContractors[0]],
    roleRates: sampleRoleRates.filter(
      (rr) => rr.contractorId === "contractor1",
    ),
    onChange: (roleRates) => console.log("Role rates changed:", roleRates),
    showProjects: true,
    showTaskTypes: false,
    showActivityTypes: false,
  },
};

export const DifferentCurrencies: Story = {
  args: {
    projects: sampleProjects,
    contractors: sampleContractors,
    roleRates: [
      {
        contractorId: "contractor1",
        rate: {
          billing: "hourly",
          activityTypes: [],
          taskTypes: [],
          projectIds: ["proj1"],
          costRate: 40,
          costCurrency: "EUR",
          billingRate: 80,
          billingCurrency: "USD",
        },
      },
      {
        contractorId: "contractor2",
        rate: {
          billing: "hourly",
          activityTypes: [],
          taskTypes: [],
          projectIds: ["proj2"],
          costRate: 50,
          costCurrency: "PLN",
          billingRate: 100,
          billingCurrency: "EUR",
        },
      },
      {
        contractorId: "contractor3",
        rate: {
          billing: "hourly",
          activityTypes: [],
          taskTypes: [],
          projectIds: ["proj3"],
          costRate: 45,
          costCurrency: "GBP",
          billingRate: 85,
          billingCurrency: "USD",
        },
      },
    ],
    onChange: (roleRates) => console.log("Role rates changed:", roleRates),
    showProjects: true,
    showTaskTypes: false,
    showActivityTypes: false,
  },
};

export const ProjectsOnly: Story = {
  args: {
    projects: sampleProjects,
    contractors: sampleContractors,
    roleRates: sampleRoleRates,
    onChange: (roleRates) => console.log("Role rates changed:", roleRates),
    showProjects: true,
    showTaskTypes: false,
    showActivityTypes: false,
  },
};

export const Interactive: Story = {
  render: () => {
    const InteractiveRoleEditor = () => {
      const [roleRates, setRoleRates] =
        useState<RoleRateWithContractor[]>(sampleRoleRates);

      return (
        <RoleEditor
          projects={sampleProjects}
          taskTypes={sampleTaskTypes}
          activityTypes={sampleActivityTypes}
          contractors={sampleContractors}
          roleRates={roleRates}
          onChange={setRoleRates}
          showProjects={true}
          showTaskTypes={true}
          showActivityTypes={true}
        />
      );
    };

    return <InteractiveRoleEditor />;
  },
  parameters: {
    docs: {
      description: {
        story:
          "Interactive story where you can add, remove, and modify role rates with live state management and currency formatting.",
      },
    },
  },
};
