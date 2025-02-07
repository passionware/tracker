import { describe, expect, it } from "vitest";
import { createGuardedAccessor } from "./guardedAccessor";

describe("createGuardedAccessor", () => {
  it("should return provided services", () => {
    const services = {
      a: 42,
      b: "hello",
    };
    const accessor = createGuardedAccessor(services);

    expect(accessor.a).toBe(42);
    expect(accessor.b).toBe("hello");
  });

  it("should throw an error for missing properties", () => {
    const services = {
      a: 42,
    };
    const accessor = createGuardedAccessor(services);

    // @ts-expect-error Testing for runtime behavior
    expect(() => accessor.b).toThrowError(
      "Attempted to access missing property: b",
    );
  });

  it("should support custom error messages", () => {
    const services = {
      a: 42,
    };
    const accessor = createGuardedAccessor(services, "Service %s not found");

    // @ts-expect-error Testing for runtime behavior
    expect(() => accessor.b).toThrowError("Service b not found");
  });
});
