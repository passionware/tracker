export interface CubeDateRange {
  start: Date;
  end: Date;
}

function parseDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function parseCandidate(candidate: any): CubeDateRange | null {
  if (!candidate) {
    return null;
  }

  const start =
    parseDate(candidate.start) ??
    parseDate(candidate.begin) ??
    parseDate(candidate.from);
  const end =
    parseDate(candidate.end) ??
    parseDate(candidate.finish) ??
    parseDate(candidate.to);

  if (start && end) {
    return { start, end };
  }

  return null;
}

/**
 * Attempts to infer the cube's covered date range from serialized cube metadata and data rows.
 */
export function getCubeDateRange(source: any): CubeDateRange | null {
  if (!source) {
    return null;
  }

  const candidates = [
    source.dateRange,
    source.range,
    source.meta?.dateRange,
    source.meta?.range,
    source.metadata?.dateRange,
    source.metadata?.range,
    source.config?.dateRange,
    source.config?.range,
    source.config?.meta?.dateRange,
    source.config?.meta?.range,
  ];

  for (const candidate of candidates) {
    const parsed = parseCandidate(candidate);
    if (parsed) {
      return parsed;
    }
  }

  const data: any[] | undefined =
    (Array.isArray(source.data) && source.data) ||
    (Array.isArray(source.config?.data) && source.config.data);

  if (!data || data.length === 0) {
    return null;
  }

  const dateValues = data
    .map((item) => parseDate(item.startAt || item.start_at))
    .filter((value): value is Date => value !== null);

  if (dateValues.length === 0) {
    return null;
  }

  const timestamps = dateValues.map((date) => date.getTime());
  return {
    start: new Date(Math.min(...timestamps)),
    end: new Date(Math.max(...timestamps)),
  };
}
