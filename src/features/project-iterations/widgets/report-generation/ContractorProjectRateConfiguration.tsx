import { ContractorBase } from "@/api/contractor/contractor.api";
import { RoleRate } from "@/services/io/_common/GenericReport";
import { RoleEditor, RoleRateWithContractor } from "@/features/_common/elements/role-editor/RoleEditor";
import { SimpleItem } from "@/features/_common/elements/pickers/SimpleView";
import { useMemo, useState, useEffect } from "react";

export interface ContractorProjectRateConfigurationProps {
  contractors: ContractorBase[];
  projects: Array<{ id: number; name: string }>;
  prefilledRates: Array<{
    contractorId: number;
    rates: Array<{
      id: string;
      costRate: number;
      costCurrency: string;
      billingRate: number;
      billingCurrency: string;
      projectId?: number;
      rateSource?: "expression" | "manual";
    }>;
  }>;
  onRatesConfigured: (
    rates: Array<{
      contractorId: number;
      rates: Array<{
        id: string;
        costRate: number;
        costCurrency: string;
        billingRate: number;
        billingCurrency: string;
        projectId?: number;
        rateSource?: "expression" | "manual";
      }>;
    }>,
  ) => void;
}

export function ContractorProjectRateConfiguration({
  contractors,
  projects,
  prefilledRates,
  onRatesConfigured,
}: ContractorProjectRateConfigurationProps) {
  // Convert contractors to SimpleItem format
  const contractorItems: SimpleItem[] = useMemo(
    () =>
      contractors.map((c) => ({
        id: c.id.toString(),
        label: c.fullName,
      })),
    [contractors],
  );

  // Convert projects to SimpleItem format
  const projectItems: SimpleItem[] = useMemo(
    () =>
      projects.map((p) => ({
        id: p.id.toString(),
        label: p.name,
      })),
    [projects],
  );

  // Convert prefilled rates to RoleRateWithContractor format
  const [roleRates, setRoleRates] = useState<RoleRateWithContractor[]>(() => {
    return prefilledRates.flatMap((prefilled) =>
      prefilled.rates.map((rate) => ({
        contractorId: prefilled.contractorId.toString(),
        rate: {
          billing: "hourly",
          activityTypes: [],
          taskTypes: [],
          projectIds: rate.projectId ? [rate.projectId.toString()] : [],
          costRate: rate.costRate,
          costCurrency: rate.costCurrency,
          billingRate: rate.billingRate,
          billingCurrency: rate.billingCurrency,
        } as RoleRate,
      })),
    );
  });

  // Update parent when rates change
  useEffect(() => {
    const groupedRates = roleRates.reduce(
      (acc, roleRate) => {
        const contractorId = parseInt(roleRate.contractorId);
        if (!acc[contractorId]) {
          acc[contractorId] = {
            contractorId,
            rates: [],
          };
        }
        acc[contractorId].rates.push({
          id: `${contractorId}_${roleRate.rate.projectIds.join("_")}`,
          costRate: roleRate.rate.costRate,
          costCurrency: roleRate.rate.costCurrency,
          billingRate: roleRate.rate.billingRate,
          billingCurrency: roleRate.rate.billingCurrency,
          projectId:
            roleRate.rate.projectIds.length === 1
              ? parseInt(roleRate.rate.projectIds[0])
              : undefined,
          rateSource: "manual" as const,
        });
        return acc;
      },
      {} as Record<
        number,
        {
          contractorId: number;
          rates: Array<{
            id: string;
            costRate: number;
            costCurrency: string;
            billingRate: number;
            billingCurrency: string;
            projectId?: number;
            rateSource?: "expression" | "manual";
          }>;
        }
      >,
    );

    onRatesConfigured(Object.values(groupedRates));
  }, [roleRates, onRatesConfigured]);

  return (
    <RoleEditor
      contractors={contractorItems}
      projects={projectItems}
      roleRates={roleRates}
      onChange={setRoleRates}
      showProjects={true}
      showTaskTypes={false}
      showActivityTypes={false}
    />
  );
}
