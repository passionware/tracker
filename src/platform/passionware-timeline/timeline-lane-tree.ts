export interface Lane {
  id: string;
  name: string;
  color: string;
  /** Nested sublanes (e.g. iteration → reports → billings). Omit for a flat track. */
  children?: Lane[];
  /**
   * When true, row shows an expand control even if `children` is empty (e.g. lazy data).
   * When omitted, expandable iff `children?.length > 0`.
   */
  expandable?: boolean;
}

export interface VisibleTimelineLaneRow extends Lane {
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
}

function nodeIsExpandable(node: Lane): boolean {
  if (node.expandable !== undefined) return node.expandable;
  return (node.children?.length ?? 0) > 0;
}

/**
 * Depth-first list of lane rows: each root, then expanded descendants.
 * Flat roots (`children` omitted) yield one row each at depth 0.
 */
export function flattenVisibleTimelineLanes(
  roots: Lane[],
  expandedLaneIds: ReadonlySet<string>,
): VisibleTimelineLaneRow[] {
  const out: VisibleTimelineLaneRow[] = [];

  function walk(nodes: Lane[], depth: number) {
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
      });
      if (expanded && children.length > 0) {
        walk(children, depth + 1);
      }
    }
  }

  walk(roots, 0);
  return out;
}
