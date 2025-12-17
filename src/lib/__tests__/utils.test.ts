/**
 * Utility Function Test Example
 * Tests the cn utility function from lib/utils
 */

import { cn } from "../utils";

describe("cn utility function", () => {
  it("merges class names correctly", () => {
    const result = cn("class1", "class2");
    expect(result).toContain("class1");
    expect(result).toContain("class2");
  });

  it("handles conditional classes", () => {
    const result = cn("base", true && "conditional", false && "not-included");
    expect(result).toContain("base");
    expect(result).toContain("conditional");
    expect(result).not.toContain("not-included");
  });

  it("handles empty input", () => {
    const result = cn();
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });

  it("handles undefined and null values", () => {
    const result = cn("base", undefined, null, "other");
    expect(result).toContain("base");
    expect(result).toContain("other");
  });
});
