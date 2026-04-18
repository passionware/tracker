export type TimelineMinuteRange = {
  start: number;
  end: number;
};

function normalizeRange(
  range: TimelineMinuteRange,
): TimelineMinuteRange | null {
  const start = Math.min(range.start, range.end);
  const end = Math.max(range.start, range.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  return { start, end };
}

/** Merge overlapping/touching half-open minute ranges `[start, end)`. */
export function unionMinuteRanges(
  ranges: TimelineMinuteRange[],
): TimelineMinuteRange[] {
  const normalized = ranges
    .map(normalizeRange)
    .filter((r): r is TimelineMinuteRange => r != null)
    .sort((a, b) => a.start - b.start);

  if (normalized.length === 0) return [];
  const out: TimelineMinuteRange[] = [normalized[0]];

  for (let i = 1; i < normalized.length; i++) {
    const prev = out[out.length - 1];
    const next = normalized[i];
    if (next.start <= prev.end) {
      prev.end = Math.max(prev.end, next.end);
      continue;
    }
    out.push({ start: next.start, end: next.end });
  }

  return out;
}

/** Subtract `cuts` from `source` (all treated as `[start, end)` minutes). */
export function differenceMinuteRanges(
  source: TimelineMinuteRange[],
  cuts: TimelineMinuteRange[],
): TimelineMinuteRange[] {
  const base = unionMinuteRanges(source);
  const blockers = unionMinuteRanges(cuts);
  if (base.length === 0 || blockers.length === 0) return base;

  const out: TimelineMinuteRange[] = [];
  let j = 0;

  for (const b of base) {
    let cursor = b.start;
    while (j < blockers.length && blockers[j].end <= cursor) j++;
    let k = j;
    while (k < blockers.length && blockers[k].start < b.end) {
      const c = blockers[k];
      if (c.start > cursor) {
        out.push({ start: cursor, end: Math.min(c.start, b.end) });
      }
      cursor = Math.max(cursor, c.end);
      if (cursor >= b.end) break;
      k++;
    }
    if (cursor < b.end) {
      out.push({ start: cursor, end: b.end });
    }
  }

  return out;
}
