import { Dispatch, SetStateAction, useCallback } from "react";
import { money } from "@/platform/lang/money.ts";

type DraftWithAmounts = {
  netValue?: number | null;
  grossValue?: number | null;
};

const clampVat = (vatPercent: number) => Math.min(100, Math.max(0, vatPercent));

const toFiniteOrUndefined = (value: string): number | undefined => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function grossFromNet(net: number, vatPercent: number): number {
  const vat = clampVat(vatPercent);
  return money.round(net * (1 + vat / 100));
}

export function netFromGross(gross: number, vatPercent: number): number {
  const vat = clampVat(vatPercent);
  const divisor = 1 + vat / 100;
  if (divisor <= 0) return money.round(gross);
  return money.round(gross / divisor);
}

type UseCostDraftAmountsParams<T extends DraftWithAmounts> = {
  vatPercent: number;
  setCostDraft: Dispatch<SetStateAction<T>>;
  onVatPercentChange: (value: number) => void;
};

export function useCostDraftAmounts<T extends DraftWithAmounts>({
  vatPercent,
  setCostDraft,
  onVatPercentChange,
}: UseCostDraftAmountsParams<T>) {
  const vatPercentClamped = clampVat(vatPercent);

  const setNetValue = useCallback(
    (netValue: number | null | undefined) => {
      setCostDraft((draft) => ({
        ...draft,
        netValue,
        grossValue:
          netValue != null && Number.isFinite(netValue)
            ? grossFromNet(netValue, vatPercentClamped)
            : draft.grossValue,
      }));
    },
    [setCostDraft, vatPercentClamped],
  );

  const onNetValueChange = useCallback(
    (value: string) => {
      setNetValue(toFiniteOrUndefined(value));
    },
    [setNetValue],
  );

  const onGrossValueChange = useCallback(
    (value: string) => {
      const grossValue = toFiniteOrUndefined(value);
      setCostDraft((draft) => ({
        ...draft,
        grossValue,
        netValue:
          grossValue != null && Number.isFinite(grossValue)
            ? netFromGross(grossValue, vatPercentClamped)
            : draft.netValue,
      }));
    },
    [setCostDraft, vatPercentClamped],
  );

  const onVatPercentInputChange = useCallback(
    (value: number | undefined) => {
      const vat = clampVat(value ?? 0);
      onVatPercentChange(vat);
      setCostDraft((draft) => {
        const grossValue = draft.grossValue;
        if (grossValue != null && Number.isFinite(grossValue)) {
          return {
            ...draft,
            netValue: netFromGross(grossValue, vat),
          };
        }
        const netValue = draft.netValue;
        return {
          ...draft,
          grossValue:
            netValue != null && Number.isFinite(netValue)
              ? grossFromNet(netValue, vat)
              : draft.grossValue,
        };
      });
    },
    [onVatPercentChange, setCostDraft],
  );

  return {
    vatPercentClamped,
    setNetValue,
    onNetValueChange,
    onGrossValueChange,
    onVatPercentInputChange,
  };
}
