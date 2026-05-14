import { ContractorBase } from "@/api/contractor/contractor.api";
import {
  RoleEditor,
  RoleRateWithContractor,
} from "@/features/_common/elements/role-editor/RoleEditor";
import { SimpleItem } from "@/features/_common/elements/pickers/SimpleView";
import { useMemo, useState, useEffect } from "react";
import { PrefilledRateResult } from "@/services/io/ReportGenerationService/plugins/_common/extractPrefilledRates";

export interface ContractorProjectRateConfigurationProps {
  contractors: ContractorBase[];
  projects: Array<{ id: string; name: string }>;
  prefilledRates: PrefilledRateResult;
  onRatesConfigured: (rates: PrefilledRateResult) => void;
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
        roleId: prefilled.roleId,
        rate,
      })),
    );
  });

  // Update parent when rates change
  useEffect(() => {
    const groupedRates = roleRates.reduce(
      (acc, roleRate) => {
        const roleId = roleRate.roleId;
        if (roleId == null) {
          throw new Error(
            "ContractorProjectRateConfiguration: rate row is missing roleId (required for TMetric prefilled rates).",
          );
        }
        if (!acc[roleId]) {
          acc[roleId] = {
            roleId,
            contractorId: parseInt(roleRate.contractorId, 10),
            rates: [],
          };
        }
        acc[roleId].rates.push(roleRate.rate);
        return acc;
      },
      {} as Record<string, PrefilledRateResult[number]>,
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
