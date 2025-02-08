import { assert } from "@/platform/lang/assert.ts";

/**
 * Takes absolute path of parent "router" that will be used as base and absolute path of child "router" that will be used as to and returns relative path from base to
 */
export function makeRelativePath(base: string, to: string): string {
  assert(base.startsWith("/"), `Base path must start with /, got ${base}`);
  return to.substring(base.length);
}
