import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WithFrontServices } from "@/core/frontServices";
import { mt, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

export interface BudgetTargetFormProps {
  services: Pick<
    WithFrontServices["services"],
    "mutationService" | "iterationTriggerService"
  >;
  projectIterationId: ProjectIteration["id"];
  currency: string;
  className?: string;
}

export function BudgetTargetForm({
  services,
  projectIterationId,
  currency,
  className,
}: BudgetTargetFormProps) {
  const currentTargetRd =
    services.iterationTriggerService.useCurrentBudgetTarget(projectIterationId);
  const currentTarget = rd.getOrElse(currentTargetRd, () => null);

  const form = useForm<{ budgetTarget: string }>({
    defaultValues: {
      budgetTarget: currentTarget != null ? String(currentTarget) : "",
    },
  });
  const updateMutation = promiseState.useMutation(
    async (value: number | null) => {
      await services.mutationService.logBudgetTargetChange(
        projectIterationId,
        value,
        undefined,
      );
    },
  );

  useEffect(() => {
    form.reset({
      budgetTarget: currentTarget != null ? String(currentTarget) : "",
    });
  }, [currentTarget, form]);

  const onSubmit = form.handleSubmit((data) => {
    const raw = data.budgetTarget.trim();
    const value: number | null = raw === "" ? null : Number(raw);
    if (
      value !== null &&
      (Number.isNaN(value) || value < 0)
    ) {
      form.setError("budgetTarget", {
        type: "manual",
        message: "Must be a non-negative number",
      });
      return;
    }
    void updateMutation.track(value);
  });

  return (
    <div className={className}>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={onSubmit}
      >
        <label
          className="text-xs font-medium shrink-0"
          htmlFor="budget-target-input"
        >
          Budget target ({currency})
        </label>
        <Input
          id="budget-target-input"
          type="number"
          min={0}
          step={0.01}
          placeholder="Optional"
          className="h-8 text-sm w-32"
          {...form.register("budgetTarget")}
        />
        <Button
          type="submit"
          size="sm"
          className="h-8 shrink-0"
          disabled={mt.isInProgress(updateMutation.state)}
        >
          {mt.isInProgress(updateMutation.state) ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Update"
          )}
        </Button>
      </form>
      {form.formState.errors.budgetTarget?.message && (
        <p className="text-xs text-destructive -mt-2">
          {form.formState.errors.budgetTarget.message}
        </p>
      )}
    </div>
  );
}
