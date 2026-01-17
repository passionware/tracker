import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SimpleArrayPicker } from "@/features/_common/elements/pickers/SimpleArrayPicker";
import { RoleConfigurationGridLayout } from "./RoleConfigurationGridLayout";
import { X } from "lucide-react";

export interface ProjectDefinition {
  id: string;
  label: string;
}

export interface ContractorDefinition {
  id: string;
  label: string;
}

export interface Role {
  contractorId: string;
  projectIds: string[];
  internalRate: number;
  internalCurrency: string;
  externalRate: number;
  externalCurrency: string;
}

export interface RoleEditorProps {
  projects: ProjectDefinition[];
  contractors: ContractorDefinition[];
  roles: Role[];
  onChange: (roles: Role[]) => void;
}

const COMMON_CURRENCIES = ["EUR", "USD", "PLN", "GBP"];

export function RoleEditor({
  projects,
  contractors,
  roles,
  onChange,
}: RoleEditorProps) {
  // Group roles by contractor for easier management
  const contractorRoles = contractors.map((contractor) => ({
    contractor,
    roles: roles.filter((role) => role.contractorId === contractor.id),
  }));

  const handleAddRole = (contractorId: string) => {
    const newRole: Role = {
      contractorId,
      projectIds: projects.length > 0 ? [projects[0].id] : [],
      internalRate: 0,
      internalCurrency: "EUR",
      externalRate: 0,
      externalCurrency: "EUR",
    };

    onChange([...roles, newRole]);
  };

  const handleRemoveRole = (contractorId: string, roleIndex: number) => {
    onChange(
      roles.filter(
        (role, index) =>
          !(role.contractorId === contractorId && index === roleIndex),
      ),
    );
  };

  const handleRoleChange = (
    contractorId: string,
    roleIndex: number,
    field: keyof Role,
    value: string | number | string[],
  ) => {
    onChange(
      roles.map((role, index) =>
        role.contractorId === contractorId && index === roleIndex
          ? { ...role, [field]: value }
          : role,
      ),
    );
  };

  const totalRoles = roles.length;
  const activeContractors = contractorRoles.filter(
    ({ roles }) => roles.length > 0,
  ).length;
  const getInitials = (label: string) =>
    label
      .split(" ")
      .filter(Boolean)
      .map((chunk) => chunk[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-slate-200/80 bg-slate-50/60 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/40">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-violet-500/10 via-transparent to-blue-500/10" />
        <CardHeader className="relative gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">Role Configuration</CardTitle>
              <CardDescription>
                Configure internal and external rates for each
                contractor-project combination.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="secondary" variant="info">
                {activeContractors} active contractor
                {activeContractors === 1 ? "" : "s"}
              </Badge>
              <Badge tone="secondary" variant="neutral">
                {totalRoles} total role{totalRoles === 1 ? "" : "s"}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <RoleConfigurationGridLayout.Root>
        {contractorRoles.map(({ contractor, roles: contractorRoles }) => (
          <RoleConfigurationGridLayout.Contractor
            key={contractor.id}
            title={contractor.label}
            subtitle={`${contractorRoles.length} rate${contractorRoles.length === 1 ? "" : "s"} configured`}
            avatar={
              <Avatar className="h-11 w-11 ring-2 ring-white shadow-sm dark:ring-slate-950">
                <AvatarFallback className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {getInitials(contractor.label)}
                </AvatarFallback>
              </Avatar>
            }
            onAddRole={() => handleAddRole(contractor.id)}
          >
            {contractorRoles.length === 0 ? (
              <div className="flex flex-col gap-3 rounded-lg border border-dashed border-slate-200/80 bg-slate-50/50 p-5 text-sm text-muted-foreground dark:border-slate-800/80 dark:bg-slate-950/40 col-span-full">
                <span>No rates configured yet for this contractor.</span>
                <Button
                  onClick={() => handleAddRole(contractor.id)}
                  size="sm"
                  variant="secondary"
                  className="w-fit"
                >
                  Create first rate
                </Button>
              </div>
            ) : (
              contractorRoles.map((role, roleIndex) => {
                // Find the actual index in the global roles array
                const globalRoleIndex = roles.findIndex((r) => r === role);

                return (
                  <RoleConfigurationGridLayout.Project
                    key={`${role.contractorId}-${roleIndex}`}
                  >
                    <div className="space-y-2 whitespace-nowrap">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Projects
                      </Label>
                      <SimpleArrayPicker
                        align="end"
                        side="bottom"
                        items={projects}
                        value={role.projectIds}
                        size="lg"
                        itemSize="sm"
                        className="w-full"
                        onSelect={(projectIds) =>
                          handleRoleChange(
                            role.contractorId,
                            globalRoleIndex,
                            "projectIds",
                            projectIds,
                          )
                        }
                      />
                    </div>

                    <div className="space-y-2 whitespace-nowrap">
                      <Label
                        htmlFor={`internal-rate-${role.contractorId}-${roleIndex}`}
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        Internal Rate
                      </Label>
                      <div className="relative">
                        <NumberInput
                          className="min-w-40"
                          id={`internal-rate-${role.contractorId}-${roleIndex}`}
                          step={0.01}
                          value={role.internalRate || 0}
                          onChange={(value) =>
                            handleRoleChange(
                              role.contractorId,
                              globalRoleIndex,
                              "internalRate",
                              value,
                            )
                          }
                          placeholder="e.g. 50.00"
                          formatOptions={{
                            style: "currency",
                            currency: role.internalCurrency,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 whitespace-nowrap">
                      <Label
                        htmlFor={`internal-currency-${role.contractorId}-${roleIndex}`}
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        &nbsp;
                      </Label>
                      <Select
                        value={role.internalCurrency || "EUR"}
                        onValueChange={(value) =>
                          handleRoleChange(
                            role.contractorId,
                            globalRoleIndex,
                            "internalCurrency",
                            value,
                          )
                        }
                      >
                        <SelectTrigger className="h-10.5 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMMON_CURRENCIES.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 whitespace-nowrap">
                      <Label
                        htmlFor={`external-rate-${role.contractorId}-${roleIndex}`}
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        External Rate
                      </Label>
                      <div className="relative">
                        <NumberInput
                          className="min-w-40"
                          id={`external-rate-${role.contractorId}-${roleIndex}`}
                          step={0.01}
                          value={role.externalRate || 0}
                          onChange={(value) =>
                            handleRoleChange(
                              role.contractorId,
                              globalRoleIndex,
                              "externalRate",
                              value,
                            )
                          }
                          placeholder="e.g. 75.00"
                          formatOptions={{
                            style: "currency",
                            currency: role.externalCurrency,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 whitespace-nowrap">
                      <Label
                        htmlFor={`external-currency-${role.contractorId}-${roleIndex}`}
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        &nbsp;
                      </Label>
                      <Select
                        value={role.externalCurrency || "EUR"}
                        onValueChange={(value) =>
                          handleRoleChange(
                            role.contractorId,
                            globalRoleIndex,
                            "externalCurrency",
                            value,
                          )
                        }
                      >
                        <SelectTrigger className="h-10.5 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMMON_CURRENCIES.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 whitespace-nowrap">
                      <Label
                        htmlFor={`external-currency-${role.contractorId}-${roleIndex}`}
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        &nbsp;
                      </Label>
                      <Button
                        onClick={() =>
                          handleRemoveRole(role.contractorId, globalRoleIndex)
                        }
                        size="icon-sm"
                        className="size-10.5"
                        variant="ghost"
                      >
                        <X />
                      </Button>
                    </div>
                  </RoleConfigurationGridLayout.Project>
                );
              })
            )}
          </RoleConfigurationGridLayout.Contractor>
        ))}
      </RoleConfigurationGridLayout.Root>

      <div className="flex justify-end">
        <div className="text-xs font-medium text-muted-foreground">
          Showing {totalRoles} role{totalRoles === 1 ? "" : "s"} across{" "}
          {contractors.length} contractor
          {contractors.length === 1 ? "" : "s"}
        </div>
      </div>
    </div>
  );
}
