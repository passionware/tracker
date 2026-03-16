import type { EntityDrawerNode } from "./useEntityDrawerState";

export type CreateNodeFn = (entity: unknown) => EntityDrawerNode;

let currentCreateNode: CreateNodeFn | null = null;

export function setCurrentCreateNode(fn: CreateNodeFn): void {
  currentCreateNode = fn;
}

export function getCreateNode(): CreateNodeFn {
  if (currentCreateNode == null) {
    throw new Error(
      "getCreateNode() called before createEntityDrawerNodeFactory(); ensure the drawer factory is created first.",
    );
  }
  return currentCreateNode;
}
