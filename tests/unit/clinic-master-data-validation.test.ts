import { describe, expect, it } from "vitest";

import {
  createServiceSchema,
  doctorProfilePatchSchema,
  doctorServiceUpsertSchema,
  doctorSpecialtyReplaceSchema,
  servicePatchSchema,
  specialtyPatchSchema,
} from "../../src/server/clinic-master-data/master-data-validation";

const reason = "Approved clinic catalog maintenance";

describe("specialty master-data validation", () => {
  it("accepts a valid specialty description update", () => {
    expect(specialtyPatchSchema.safeParse({ description: "Adult outpatient care", reason }).success).toBe(true);
  });

  it("rejects a reason without an editable field", () => {
    expect(specialtyPatchSchema.safeParse({ reason }).success).toBe(false);
  });

  it("rejects unsupported fields instead of silently accepting them", () => {
    expect(specialtyPatchSchema.safeParse({ code: "NEW_CODE", reason }).success).toBe(false);
  });

  it("allows clearing an optional description", () => {
    expect(specialtyPatchSchema.safeParse({ description: null, reason }).success).toBe(true);
  });
});

describe("doctor profile validation", () => {
  it("accepts a bounded public profile update", () => {
    expect(
      doctorProfilePatchSchema.safeParse({
        publicDisplayName: "Dr. MERUNO Demo",
        yearsOfExperience: 12,
        isPubliclyVisible: true,
        reason,
      }).success,
    ).toBe(true);
  });

  it("rejects negative years of experience", () => {
    expect(doctorProfilePatchSchema.safeParse({ yearsOfExperience: -1, reason }).success).toBe(false);
  });

  it("rejects an empty doctor profile update", () => {
    expect(doctorProfilePatchSchema.safeParse({ reason }).success).toBe(false);
  });
});

describe("doctor specialty mapping validation", () => {
  it("accepts a unique specialty set with one included primary specialty", () => {
    expect(
      doctorSpecialtyReplaceSchema.safeParse({
        doctorId: "doctor-demo",
        specialtyIds: ["specialty-a", "specialty-b"],
        primarySpecialtyId: "specialty-a",
        reason,
      }).success,
    ).toBe(true);
  });

  it("requires the target doctor identifier", () => {
    expect(
      doctorSpecialtyReplaceSchema.safeParse({
        specialtyIds: ["specialty-a"],
        primarySpecialtyId: "specialty-a",
        reason,
      }).success,
    ).toBe(false);
  });

  it("requires the primary specialty to be in the assigned set", () => {
    expect(
      doctorSpecialtyReplaceSchema.safeParse({
        doctorId: "doctor-demo",
        specialtyIds: ["specialty-a"],
        primarySpecialtyId: "specialty-b",
        reason,
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate specialty assignments", () => {
    expect(
      doctorSpecialtyReplaceSchema.safeParse({
        doctorId: "doctor-demo",
        specialtyIds: ["specialty-a", "specialty-a"],
        primarySpecialtyId: "specialty-a",
        reason,
      }).success,
    ).toBe(false);
  });
});

describe("service catalog validation", () => {
  it("accepts a valid consultation service", () => {
    expect(
      createServiceSchema.safeParse({
        code: "SPECIAL_CONSULT",
        name: "Specialist Consultation",
        type: "CONSULTATION",
        description: null,
        reason,
      }).success,
    ).toBe(true);
  });

  it("rejects lower-case or punctuated service codes", () => {
    expect(
      createServiceSchema.safeParse({
        code: "consultation-1",
        name: "Consultation",
        type: "CONSULTATION",
        reason,
      }).success,
    ).toBe(false);
  });

  it("rejects unsupported service types", () => {
    expect(
      createServiceSchema.safeParse({
        code: "OTHER_SERVICE",
        name: "Other Service",
        type: "LABORATORY",
        reason,
      }).success,
    ).toBe(false);
  });

  it("accepts a soft-deactivation update", () => {
    expect(servicePatchSchema.safeParse({ isActive: false, reason }).success).toBe(true);
  });

  it("rejects service updates that contain no editable fields", () => {
    expect(servicePatchSchema.safeParse({ reason }).success).toBe(false);
  });
});

describe("doctor service duration and EGP price validation", () => {
  const validOffering = {
    doctorId: "doctor-demo",
    serviceId: "service-consultation",
    durationMinutes: 30,
    price: "450.00",
    reason,
  };

  it("accepts a positive EGP amount with two decimal places", () => {
    const parsed = doctorServiceUpsertSchema.safeParse(validOffering);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.price).toBe(450);
  });

  it("rejects prices with more than two decimal places", () => {
    expect(doctorServiceUpsertSchema.safeParse({ ...validOffering, price: "450.125" }).success).toBe(false);
  });

  it("rejects a zero price", () => {
    expect(doctorServiceUpsertSchema.safeParse({ ...validOffering, price: "0.00" }).success).toBe(false);
  });

  it("rejects a duration shorter than five minutes", () => {
    expect(doctorServiceUpsertSchema.safeParse({ ...validOffering, durationMinutes: 4 }).success).toBe(false);
  });

  it("rejects a duration longer than four hours", () => {
    expect(doctorServiceUpsertSchema.safeParse({ ...validOffering, durationMinutes: 241 }).success).toBe(false);
  });
});
