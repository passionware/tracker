import { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { RoleEditor } from './RoleEditor';
import { ProjectDefinition, ContractorDefinition, Role } from './RoleEditor';
import { createFormatService } from '@/services/FormatService/FormatService.impl';

const meta: Meta<typeof RoleEditor> = {
  title: 'UI/RoleEditor',
  component: RoleEditor,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof RoleEditor>;

// Sample data
const sampleProjects: ProjectDefinition[] = [
  { id: 'proj1', label: 'Project Alpha' },
  { id: 'proj2', label: 'Project Beta' },
  { id: 'proj3', label: 'Project Gamma' },
];

const sampleContractors: ContractorDefinition[] = [
  { id: 'contractor1', label: 'John Doe' },
  { id: 'contractor2', label: 'Jane Smith' },
  { id: 'contractor3', label: 'Bob Johnson' },
];

const sampleRoles: Role[] = [
  {
    contractorId: 'contractor1',
    projectIds: ['proj1', 'proj2'],
    internalRate: 50,
    internalCurrency: 'EUR',
    externalRate: 75,
    externalCurrency: 'EUR',
  },
  {
    contractorId: 'contractor2',
    projectIds: ['proj1'],
    internalRate: 60,
    internalCurrency: 'USD',
    externalRate: 90,
    externalCurrency: 'USD',
  },
];

export const Empty: Story = {
  args: {
    projects: sampleProjects,
    contractors: sampleContractors,
    roles: [],
    onChange: (roles) => console.log('Roles changed:', roles),
    formatService: createFormatService(() => new Date()),
  },
};

export const WithRoles: Story = {
  args: {
    projects: sampleProjects,
    contractors: sampleContractors,
    roles: sampleRoles,
    onChange: (roles) => console.log('Roles changed:', roles),
    formatService: createFormatService(() => new Date()),
  },
};

export const SingleContractor: Story = {
  args: {
    projects: sampleProjects,
    contractors: [sampleContractors[0]],
    roles: sampleRoles.filter(role => role.contractorId === 'contractor1'),
    onChange: (roles) => console.log('Roles changed:', roles),
    formatService: createFormatService(() => new Date()),
  },
};

export const DifferentCurrencies: Story = {
  args: {
    projects: sampleProjects,
    contractors: sampleContractors,
    roles: [
      {
        contractorId: 'contractor1',
        projectIds: ['proj1'],
        internalRate: 40,
        internalCurrency: 'EUR',
        externalRate: 80,
        externalCurrency: 'USD',
      },
      {
        contractorId: 'contractor2',
        projectIds: ['proj2'],
        internalRate: 50,
        internalCurrency: 'PLN',
        externalRate: 100,
        externalCurrency: 'EUR',
      },
      {
        contractorId: 'contractor3',
        projectIds: ['proj3'],
        internalRate: 45,
        internalCurrency: 'GBP',
        externalRate: 85,
        externalCurrency: 'USD',
      },
    ],
    onChange: (roles) => console.log('Roles changed:', roles),
    formatService: createFormatService(() => new Date()),
  },
};

export const Interactive: Story = {
  render: () => {
    const InteractiveRoleEditor = () => {
      const [roles, setRoles] = useState<Role[]>(sampleRoles);
      const formatService = createFormatService(() => new Date());

      return (
        <RoleEditor
          projects={sampleProjects}
          contractors={sampleContractors}
          roles={roles}
          onChange={setRoles}
          formatService={formatService}
        />
      );
    };

    return <InteractiveRoleEditor />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive story where you can add, remove, and modify roles with live state management and currency formatting.',
      },
    },
  },
};
