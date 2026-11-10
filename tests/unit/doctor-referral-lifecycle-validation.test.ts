import { describe, expect, it } from "vitest";
import {
  doctorReferralIdSchema,
  doctorReferralLifecycleRequestSchema,
} from "../../src/server/appointments/doctor-referral-lifecycle-validation";

describe("Doctor referral lifecycle validation", () => {
  it.each(["ACCEPT", "COMPLETE", "CANCEL"] as const)("accepts the %s action", (action) => {
    expect(doctorReferralLifecycleRequestSchema.safeParse({ action }).success).toBe(true);
  });
  it("rejects an unsupported action such as REJECT", () => {
    expect(doctorReferralLifecycleRequestSchema.safeParse({ action: "REJECT" }).success).toBe(false);
  });
  it("rejects client-selected status and actor fields", () => {
    expect(doctorReferralLifecycleRequestSchema.safeParse({
      action: "ACCEPT",
      status: "COMPLETED",
      actorEmployeeId: "employee_forged",
    }).success).toBe(false);
  });
  it("rejects empty and oversized referral identifiers", () => {
    expect(doctorReferralIdSchema.safeParse("").success).toBe(false);
    expect(doctorReferralIdSchema.safeParse("r".repeat(81)).success).toBe(false);
  });
  it("trims a bounded referral identifier", () => {
    expect(doctorReferralIdSchema.parse(" referral_1 ")).toBe("referral_1");
  });
});
