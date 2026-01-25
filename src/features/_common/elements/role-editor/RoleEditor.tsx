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
import { RoleRate } from "@/services/io/_common/GenericReport";
import { X } from "lucide-react";

export interface ProjectDefinition {
  id: string;
  label: string;
}

export interface ContractorDefinition {
  id: string;
  label: string;
}

export interface TaskTypeDefinition {
  id: string;
  label: string;
}

export interface ActivityTypeDefinition {
  id: string;
  label: string;
}

export interface RoleRateWithContractor {
  contractorId: string;
  rate: RoleRate;
}

export interface RoleEditorProps {
  projects?: ProjectDefinition[];
  taskTypes?: TaskTypeDefinition[];
  activityTypes?: ActivityTypeDefinition[];
  contractors: ContractorDefinition[];
  roleRates: RoleRateWithContractor[];
  onChange: (roleRates: RoleRateWithContractor[]) => void;
  showProjects?: boolean;
  showTaskTypes?: boolean;
  showActivityTypes?: boolean;
}

const COMMON_CURRENCIES = ["EUR", "USD", "PLN", "GBP"];

export function RoleEditor({
  projects = [],
  taskTypes = [],
  activityTypes = [],
  contractors,
  roleRates,
  onChange,
  showProjects = true,
  showTaskTypes = false,
  showActivityTypes = false,
}: RoleEditorProps) {
  // Group role rates by contractor for easier management
  const contractorRoles = contractors.map((contractor) => ({
    contractor,
    rates: roleRates
      .filter((rr) => rr.contractorId === contractor.id)
      .map((rr) => rr.rate),
  }));

  const handleAddRate = (contractorId: string) => {
    const newRate: RoleRate = {
      billing: "hourly",
      activityTypes:
        showActivityTypes && activityTypes.length > 0
          ? [activityTypes[0].id]
          : [],
      taskTypes: showTaskTypes && taskTypes.length > 0 ? [taskTypes[0].id] : [],
      projectIds: showProjects && projects.length > 0 ? [projects[0].id] : [],
      costRate: 0,
      costCurrency: "EUR",
      billingRate: 0,
      billingCurrency: "EUR",
    };

    onChange([...roleRates, { contractorId, rate: newRate }]);
  };

  const handleRemoveRate = (contractorId: string, rateIndex: number) => {
    const contractorRates = roleRates.filter(
      (rr) => rr.contractorId === contractorId,
    );
    const rateToRemove = contractorRates[rateIndex];
    onChange(roleRates.filter((rr) => rr !== rateToRemove));
  };

  const handleRateChange = (
    contractorId: string,
    rateIndex: number,
    field: keyof RoleRate,
    value: string | number | string[] | undefined,
  ) => {
    // For required array fields (activityTypes, taskTypes, projectIds), ensure we always have an array
    if (
      (field === "activityTypes" ||
        field === "taskTypes" ||
        field === "projectIds") &&
      value === undefined
    ) {
      value = [];
    }
    const contractorRates = roleRates.filter(
      (rr) => rr.contractorId === contractorId,
    );
    const rateToUpdate = contractorRates[rateIndex];
    const updatedRate = { ...rateToUpdate.rate, [field]: value };
    const updatedRoleRate = { ...rateToUpdate, rate: updatedRate };

    onChange(
      roleRates.map((rr) => (rr === rateToUpdate ? updatedRoleRate : rr)),
    );
  };

  const totalRates = roleRates.length;
  const activeContractors = contractorRoles.filter(
    ({ rates }) => rates.length > 0,
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
              <CardTitle className="text-xl">Role Rate Configuration</CardTitle>
              <CardDescription>
                Configure cost and billing rates for each contractor with
                optional filters for projects, task types, and activity types.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="secondary" variant="info">
                {activeContractors} active contractor
                {activeContractors === 1 ? "" : "s"}
              </Badge>
              <Badge tone="secondary" variant="neutral">
                {totalRates} total rate{totalRates === 1 ? "" : "s"}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <RoleConfigurationGridLayout.Root>
        {contractorRoles.map(({ contractor, rates }) => (
          <RoleConfigurationGridLayout.Contractor
            key={contractor.id}
            title={contractor.label}
            subtitle={`${rates.length} rate${rates.length === 1 ? "" : "s"} configured`}
            avatar={
              <Avatar className="h-11 w-11 ring-2 ring-white shadow-sm dark:ring-slate-950">
                <AvatarFallback className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {getInitials(contractor.label)}
                </AvatarFallback>
              </Avatar>
            }
            onAddRole={() => handleAddRate(contractor.id)}
          >
            {rates.length === 0 ? (
              <div className="flex flex-col gap-3 rounded-lg border border-dashed border-slate-200/80 bg-slate-50/50 p-5 text-sm text-muted-foreground dark:border-slate-800/80 dark:bg-slate-950/40 col-span-full">
                <span>No rates configured yet for this contractor.</span>
                <Button
                  onClick={() => handleAddRate(contractor.id)}
                  size="sm"
                  variant="secondary"
                  className="w-fit"
                >
                  Create first rate
                </Button>
              </div>
            ) : (
              rates.map((rate, rateIndex) => {
                return (
                  <RoleConfigurationGridLayout.Project
                    key={`${contractor.id}-${rateIndex}`}
                  >
                    {showProjects && (
                      <div className="space-y-2 whitespace-nowrap">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Projects
                        </Label>
                        <SimpleArrayPicker
                          align="end"
                          side="bottom"
                          items={projects}
                          value={rate.projectIds}
                          size="lg"
                          itemSize="sm"
                          className="w-full"
                          onSelect={(projectIds) =>
                            handleRateChange(
                              contractor.id,
                              rateIndex,
                              "projectIds",
                              projectIds,
                            )
                          }
                        />
                      </div>
                    )}

                    {showTaskTypes && (
                      <div className="space-y-2 whitespace-nowrap">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Task Types
                        </Label>
                        <SimpleArrayPicker
                          align="end"
                          side="bottom"
                          items={taskTypes}
                          value={rate.taskTypes}
                          size="lg"
                          itemSize="sm"
                          className="w-full"
                          onSelect={(taskTypeIds) =>
                            handleRateChange(
                              contractor.id,
                              rateIndex,
                              "taskTypes",
                              taskTypeIds,
                            )
                          }
                        />
                      </div>
                    )}

                    {showActivityTypes && (
                      <div className="space-y-2 whitespace-nowrap">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Activity Types
                        </Label>
                        <SimpleArrayPicker
                          align="end"
                          side="bottom"
                          items={activityTypes}
                          value={rate.activityTypes}
                          size="lg"
                          itemSize="sm"
                          className="w-full"
                          onSelect={(activityTypeIds) =>
                            handleRateChange(
                              contractor.id,
                              rateIndex,
                              "activityTypes",
                              activityTypeIds,
                            )
                          }
                        />
                      </div>
                    )}

                    <div className="space-y-2 whitespace-nowrap">
                      <Label
                        htmlFor={`cost-rate-${contractor.id}-${rateIndex}`}
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        Cost Rate
                      </Label>
                      <div className="relative">
                        <NumberInput
                          className="min-w-40"
                          id={`cost-rate-${contractor.id}-${rateIndex}`}
                          step={0.01}
                          value={rate.costRate || 0}
                          onChange={(value) =>
                            handleRateChange(
                              contractor.id,
                              rateIndex,
                              "costRate",
                              value,
                            )
                          }
                          placeholder="e.g. 50.00"
                          formatOptions={{
                            style: "currency",
                            currency: rate.costCurrency,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 whitespace-nowrap">
                      <Label
                        htmlFor={`cost-currency-${contractor.id}-${rateIndex}`}
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        &nbsp;
                      </Label>
                      <Select
                        value={rate.costCurrency || "EUR"}
                        onValueChange={(value) =>
                          handleRateChange(
                            contractor.id,
                            rateIndex,
                            "costCurrency",
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
                        htmlFor={`billing-rate-${contractor.id}-${rateIndex}`}
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        Billing Rate
                      </Label>
                      <div className="relative">
                        <NumberInput
                          className="min-w-40"
                          id={`billing-rate-${contractor.id}-${rateIndex}`}
                          step={0.01}
                          value={rate.billingRate || 0}
                          onChange={(value) =>
                            handleRateChange(
                              contractor.id,
                              rateIndex,
                              "billingRate",
                              value,
                            )
                          }
                          placeholder="e.g. 75.00"
                          formatOptions={{
                            style: "currency",
                            currency: rate.billingCurrency,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 whitespace-nowrap">
                      <Label
                        htmlFor={`billing-currency-${contractor.id}-${rateIndex}`}
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        &nbsp;
                      </Label>
                      <Select
                        value={rate.billingCurrency || "EUR"}
                        onValueChange={(value) =>
                          handleRateChange(
                            contractor.id,
                            rateIndex,
                            "billingCurrency",
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
                        htmlFor={`remove-${contractor.id}-${rateIndex}`}
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        &nbsp;
                      </Label>
                      <Button
                        onClick={() =>
                          handleRemoveRate(contractor.id, rateIndex)
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
          Showing {totalRates} rate{totalRates === 1 ? "" : "s"} across{" "}
          {contractors.length} contractor
          {contractors.length === 1 ? "" : "s"}
        </div>
      </div>
    </div>
  );
}
