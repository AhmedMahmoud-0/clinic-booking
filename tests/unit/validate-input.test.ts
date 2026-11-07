import { describe, expect, it } from "vitest";
import { z } from "zod";
import { validateInput } from "../../src/lib/validation/validate-input";

const displayNameSchema = z.object({
  displayName: z.string().trim().min(2, {
    error: "Enter a display name with at least two characters.",
  }),
});

describe("validateInput", () => {
  it("returns parsed data after successful validation and transformation", async () => {
    const result = await validateInput(displayNameSchema, {
      displayName: "  MERUNO  ",
    });

    expect(result).toEqual({
      success: true,
      data: { displayName: "MERUNO" },
    });
  });

  it("returns a safe error tree when validation fails", async () => {
    const result = await validateInput(displayNameSchema, {
      displayName: "x",
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      const serializedErrors = JSON.stringify(result.errors);

      expect(serializedErrors).toContain(
        "Enter a display name with at least two characters.",
      );
      expect(serializedErrors).not.toContain('"x"');
    }
  });
});
