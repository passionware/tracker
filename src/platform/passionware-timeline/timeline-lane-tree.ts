/**
 * @typeParam TLaneMeta — Optional per-lane payload for the embedding feature (ids, grouping keys, etc.).
 *   Use `unknown` (default) when you do not attach metadata.
 */
export interface Lane<TLaneMeta = unknown> {
  id: string;
  name: string;
  color: string;
  /** Nested sublanes (e.g. iteration → reports → billings). Omit for a flat track. */
  children?: Lane<TLaneMeta>[];
  /**
   * When true, row shows an expand control even if `children` is empty (e.g. lazy data).
   * When omitted, expandable iff `children?.length > 0`.
   */
  expandable?: boolean;
  /** Feature-specific lane payload; the timeline shell ignores it. */
  meta?: TLaneMeta;
}

export interface VisibleTimelineLaneRow<TLaneMeta = unknown>
  extends Lane<TLaneMeta> {
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
}

function nodeIsExpandable<TLaneMeta>(node: Lane<TLaneMeta>): boolean {
  if (node.expandable !== undefined) return node.expandable;
  return (node.children?.length ?? 0) > 0;
}

/**
 * Depth-first list of lane rows: each root, then expanded descendants.
 * Flat roots (`children` omitted) yield one row each at depth 0.
 */
export function flattenVisibleTimelineLanes<TLaneMeta = unknown>(
  roots: Lane<TLaneMeta>[],
  expandedLaneIds: ReadonlySet<string>,
): VisibleTimelineLaneRow<TLaneMeta>[] {
  const out: VisibleTimelineLaneRow<TLaneMeta>[] = [];

  function walk(nodes: Lane<TLaneMeta>[], depth: number) {
    for (const node of nodes) {
      const children = node.children ?? [];
      const expandable = nodeIsExpandable(node);
      const expanded = expandable && expandedLaneIds.has(node.id);
      out.push({
        id: node.id,
        name: node.name,
        color: node.color,
        depth,
        hasChildren: expandable,
        expanded,
        ...(node.meta !== undefined ? { meta: node.meta } : {}),
      });
      if (expanded && children.length > 0) {
        walk(children, depth + 1);
      }
    }
  }

  walk(roots, 0);
  return out;
}
