import { describe, expect, it } from "vitest";
import { isEligibleForLegalGuardianVerification } from "../../src/server/patient-management/patient-relationship-policy";

describe("legal-guardian verification age policy", () => {
  it("allows verification for a patient under 18 on the clinic-local date", () => {
    expect(isEligibleForLegalGuardianVerification(new Date("2010-11-09T00:00:00.000Z"), "2026-11-08")).toBe(true);
  });

  it("rejects a patient who has reached 18", () => {
    expect(isEligibleForLegalGuardianVerification(new Date("2008-11-08T00:00:00.000Z"), "2026-11-08")).toBe(false);
  });

  it("treats the day before the eighteenth birthday as a minor", () => {
    expect(isEligibleForLegalGuardianVerification(new Date("2008-11-09T00:00:00.000Z"), "2026-11-08")).toBe(true);
  });

  it("fails closed when date of birth is missing or invalid", () => {
    expect(isEligibleForLegalGuardianVerification(null, "2026-11-08")).toBe(false);
    expect(isEligibleForLegalGuardianVerification(new Date("invalid"), "2026-11-08")).toBe(false);
  });

  it("rejects future birth dates and invalid clinic dates", () => {
    expect(isEligibleForLegalGuardianVerification(new Date("2027-01-01T00:00:00.000Z"), "2026-11-08")).toBe(false);
    expect(isEligibleForLegalGuardianVerification(new Date("2010-01-01T00:00:00.000Z"), "2026-02-30")).toBe(false);
  });
});
