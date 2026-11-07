import { describe, expect, it } from "vitest";
import { cn } from "../../src/lib/utils";

describe("cn", () => {
  it("combines class names in the supplied order", () => {
    expect(cn("flex", "items-center", "gap-2")).toBe(
      "flex items-center gap-2",
    );
  });

  it("omits false conditional class values", () => {
    expect(cn("flex", false && "hidden", "gap-2")).toBe("flex gap-2");
  });
});
