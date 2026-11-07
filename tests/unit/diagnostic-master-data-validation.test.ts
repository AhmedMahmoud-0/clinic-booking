import { describe, expect, it } from "vitest";

import {
  createLabTestComponentSchema,
  createLabTestSchema,
  createRadiologyProcedureSchema,
  createRadiologyResourceSchema,
  labTestComponentPatchSchema,
  labTestPatchSchema,
  radiologyProcedurePatchSchema,
  radiologyResourcePatchSchema,
} from "../../src/server/diagnostic-master-data/validation";

const reason = "Approved diagnostic catalog maintenance";

const validLabTest = {
  code: "CBC",
  name: "Complete Blood Count",
  description: "Synthetic demonstration catalog entry.",
  specimenType: "EDTA blood",
  defaultTurnaroundMinutes: 180,
  requiresFasting: false,
  preparationInstructions: null,
  price: "300.00",
  reason,
};

const validRadiologyProcedure = {
  code: "XR-CHEST-PA",
  name: "Chest X-ray (PA)",
  modality: "DIGITAL_XRAY" as const,
  description: "Synthetic demonstration procedure.",
  defaultDurationMinutes: 15,
  price: "350.00",
  preparationInstructions: "Verify patient identity and follow the approved X-ray safety workflow.",
  reason,
};

describe("laboratory test catalog validation", () => {
  it("accepts a valid EGP laboratory test", () => {
    const parsed = createLabTestSchema.safeParse(validLabTest);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.price).toBe(300);
  });

  it("rejects lowercase or punctuated catalog codes", () => {
    expect(createLabTestSchema.safeParse({ ...validLabTest, code: "cbc profile" }).success).toBe(false);
  });

  it("rejects prices with more than two decimal places", () => {
    expect(createLabTestSchema.safeParse({ ...validLabTest, price: "300.125" }).success).toBe(false);
  });

  it("rejects zero prices", () => {
    expect(createLabTestSchema.safeParse({ ...validLabTest, price: "0.00" }).success).toBe(false);
  });

  it("rejects turnaround values outside the supported range", () => {
    expect(createLabTestSchema.safeParse({ ...validLabTest, defaultTurnaroundMinutes: 0 }).success).toBe(false);
    expect(createLabTestSchema.safeParse({ ...validLabTest, defaultTurnaroundMinutes: 20_161 }).success).toBe(false);
  });

  it("rejects an empty update", () => {
    expect(labTestPatchSchema.safeParse({ reason }).success).toBe(false);
  });

  it("allows clearing optional preparation instructions", () => {
    expect(labTestPatchSchema.safeParse({ preparationInstructions: null, reason }).success).toBe(true);
  });

  it("rejects unsupported fields instead of silently accepting them", () => {
    expect(labTestPatchSchema.safeParse({ currencyCode: "USD", reason }).success).toBe(false);
  });
});

describe("laboratory test component validation", () => {
  it("accepts a numeric component with a unit", () => {
    expect(
      createLabTestComponentSchema.safeParse({
        code: "HGB",
        name: "Hemoglobin",
        valueType: "NUMERIC",
        defaultUnit: "g/dL",
        sortOrder: 3,
        reason,
      }).success,
    ).toBe(true);
  });

  it("rejects unsupported result value types", () => {
    expect(
      createLabTestComponentSchema.safeParse({
        code: "HGB",
        name: "Hemoglobin",
        valueType: "IMAGE",
        reason,
      }).success,
    ).toBe(false);
  });

  it("rejects negative component ordering", () => {
    expect(
      createLabTestComponentSchema.safeParse({
        code: "HGB",
        name: "Hemoglobin",
        valueType: "NUMERIC",
        sortOrder: -1,
        reason,
      }).success,
    ).toBe(false);
  });

  it("does not allow changing a component code or value type after creation", () => {
    expect(labTestComponentPatchSchema.safeParse({ code: "NEW_CODE", reason }).success).toBe(false);
    expect(labTestComponentPatchSchema.safeParse({ valueType: "TEXT", reason }).success).toBe(false);
  });

  it("rejects an empty component update", () => {
    expect(labTestComponentPatchSchema.safeParse({ reason }).success).toBe(false);
  });

  it("allows soft deactivation", () => {
    expect(labTestComponentPatchSchema.safeParse({ isActive: false, reason }).success).toBe(true);
  });
});

describe("radiology procedure catalog validation", () => {
  it("accepts a digital X-ray procedure", () => {
    expect(createRadiologyProcedureSchema.safeParse(validRadiologyProcedure).success).toBe(true);
  });

  it("accepts an ultrasound procedure", () => {
    expect(
      createRadiologyProcedureSchema.safeParse({ ...validRadiologyProcedure, code: "US-ABDOMEN", modality: "ULTRASOUND" }).success,
    ).toBe(true);
  });

  it("rejects MRI and all modalities outside the approved scope", () => {
    expect(
      createRadiologyProcedureSchema.safeParse({ ...validRadiologyProcedure, modality: "MRI" }).success,
    ).toBe(false);
  });

  it("rejects procedure duration shorter than five minutes or longer than four hours", () => {
    expect(createRadiologyProcedureSchema.safeParse({ ...validRadiologyProcedure, defaultDurationMinutes: 4 }).success).toBe(false);
    expect(createRadiologyProcedureSchema.safeParse({ ...validRadiologyProcedure, defaultDurationMinutes: 241 }).success).toBe(false);
  });

  it("rejects a zero procedure price", () => {
    expect(createRadiologyProcedureSchema.safeParse({ ...validRadiologyProcedure, price: 0 }).success).toBe(false);
  });

  it("does not allow changing the procedure modality after creation", () => {
    expect(radiologyProcedurePatchSchema.safeParse({ modality: "ULTRASOUND", reason }).success).toBe(false);
  });

  it("rejects an empty procedure update", () => {
    expect(radiologyProcedurePatchSchema.safeParse({ reason }).success).toBe(false);
  });
});

describe("radiology resource validation", () => {
  it("accepts a digital X-ray resource", () => {
    expect(
      createRadiologyResourceSchema.safeParse({
        code: "XR-ROOM-02",
        name: "Digital X-ray Room 02",
        modality: "DIGITAL_XRAY",
        location: "Radiology Department",
        reason,
      }).success,
    ).toBe(true);
  });

  it("rejects unsupported equipment modalities", () => {
    expect(
      createRadiologyResourceSchema.safeParse({
        code: "MRI-ROOM-01",
        name: "MRI Room",
        modality: "MRI",
        reason,
      }).success,
    ).toBe(false);
  });

  it("does not allow changing resource modality after creation", () => {
    expect(radiologyResourcePatchSchema.safeParse({ modality: "ULTRASOUND", reason }).success).toBe(false);
  });

  it("allows soft deactivation of a resource", () => {
    expect(radiologyResourcePatchSchema.safeParse({ isActive: false, reason }).success).toBe(true);
  });

  it("rejects an empty resource update", () => {
    expect(radiologyResourcePatchSchema.safeParse({ reason }).success).toBe(false);
  });
});
