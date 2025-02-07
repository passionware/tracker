import { describe, expect, it } from "vitest";
import { createLazyAccessor } from "./lazyAccessor";

describe("createLazyAccessor", () => {
  it("should lazily initialize properties", () => {
    const factory = {
      a: () => 42,
      b: () => "hello",
    };
    const accessor = createLazyAccessor(factory);

    expect(accessor.a).toBe(42);
    expect(accessor.b).toBe("hello");
  });

  it("should cache initialized properties", () => {
    let callCount = 0;
    const factory = {
      a: () => {
        callCount++;
        return 42;
      },
    };
    const accessor = createLazyAccessor(factory);

    expect(accessor.a).toBe(42);
    expect(accessor.a).toBe(42);
    expect(callCount).toBe(1);
  });

  it("should throw an error for missing properties", () => {
    const factory = {
      a: () => 42,
    };
    const accessor = createLazyAccessor(factory);

    // @ts-expect-error b is not defined in the factory
    expect(() => accessor.b).toThrowError(
      "Attempted to access missing property: b",
    );
  });
});
