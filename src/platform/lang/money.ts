const MONEY_SCALE = 100;

function toCents(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * MONEY_SCALE);
}

function fromCents(cents: number): number {
  return cents / MONEY_SCALE;
}

export const money = {
  toCents(value: number): number {
    return toCents(value);
  },
  fromCents(cents: number): number {
    return fromCents(cents);
  },
  round(value: number): number {
    return fromCents(toCents(value));
  },
  sum(values: readonly number[]): number {
    return fromCents(values.reduce((sum, value) => sum + toCents(value), 0));
  },
  add(a: number, b: number): number {
    return fromCents(toCents(a) + toCents(b));
  },
  subtract(a: number, b: number): number {
    return fromCents(toCents(a) - toCents(b));
  },
  compare(a: number, b: number): -1 | 0 | 1 {
    const diff = toCents(a) - toCents(b);
    if (diff === 0) {
      return 0;
    }
    return diff > 0 ? 1 : -1;
  },
  isZero(value: number): boolean {
    return toCents(value) === 0;
  },
};
