import { describe, expect, it } from "vitest";
import {
  labResultDraftRequestSchema,
  labSampleCollectionRequestSchema,
  labSampleTransitionRequestSchema,
} from "../../src/server/laboratory/lab-workflow-validation";

describe("Lab sample collection request validation", () => {
  it("accepts two distinct supported identity elements", () => {
    expect(labSampleCollectionRequestSchema.safeParse({
      identityVerification: {
        firstIdentifier: { type: "FULL_NAME", value: "Mona Hassan" },
        secondIdentifier: { type: "MRN", value: "MRN-001234" },
      },
    }).success).toBe(true);
  });
  it("rejects duplicate identity element types", () => {
    expect(labSampleCollectionRequestSchema.safeParse({
      identityVerification: {
        firstIdentifier: { type: "MRN", value: "MRN-001234" },
        secondIdentifier: { type: "MRN", value: "MRN-001234" },
      },
    }).success).toBe(false);
  });
  it("rejects unsupported national ID/passport collection", () => {
    expect(labSampleCollectionRequestSchema.safeParse({
      identityVerification: {
        firstIdentifier: { type: "NATIONAL_ID", value: "12345678901234" },
        secondIdentifier: { type: "MRN", value: "MRN-001234" },
      },
    }).success).toBe(false);
  });
  it("rejects blank identity values", () => {
    expect(labSampleCollectionRequestSchema.safeParse({
      identityVerification: {
        firstIdentifier: { type: "FULL_NAME", value: " " },
        secondIdentifier: { type: "MRN", value: "MRN-001234" },
      },
    }).success).toBe(false);
  });
  it("rejects additional caller-selected fields", () => {
    expect(labSampleCollectionRequestSchema.safeParse({
      identityVerification: {
        firstIdentifier: { type: "FULL_NAME", value: "Mona Hassan" },
        secondIdentifier: { type: "MRN", value: "MRN-001234" },
      },
      patientId: "forged",
    }).success).toBe(false);
  });
});

describe("Lab sample transition validation", () => {
  it("accepts RECEIVE without caller-supplied identity fields", () => {
    expect(labSampleTransitionRequestSchema.safeParse({ action: "RECEIVE" }).success).toBe(true);
  });
  it("accepts REJECT only with a reason", () => {
    expect(labSampleTransitionRequestSchema.safeParse({ action: "REJECT", reason: "Insufficient volume" }).success).toBe(true);
    expect(labSampleTransitionRequestSchema.safeParse({ action: "REJECT" }).success).toBe(false);
  });
  it("rejects client-selected actor and timestamps", () => {
    expect(labSampleTransitionRequestSchema.safeParse({ action: "RECEIVE", receivedByEmployeeId: "forged", receivedAt: "2026-01-01" }).success).toBe(false);
  });
});

describe("Lab result draft validation", () => {
  it("accepts a textual result value", () => {
    expect(labResultDraftRequestSchema.safeParse({
      values: [{ componentCode: "HB", valueText: "13.4", unit: "g/dL", abnormalFlag: "NORMAL" }],
    }).success).toBe(true);
  });
  it("accepts a numeric result value", () => {
    expect(labResultDraftRequestSchema.safeParse({
      values: [{ componentCode: "GLUCOSE", valueNumeric: 92.5, unit: "mg/dL" }],
    }).success).toBe(true);
  });
  it("accepts a boolean result value", () => {
    expect(labResultDraftRequestSchema.safeParse({
      values: [{ componentCode: "DETECTED", valueBoolean: false }],
    }).success).toBe(true);
  });
  it("rejects a duplicate component code", () => {
    expect(labResultDraftRequestSchema.safeParse({
      values: [
        { componentCode: "HB", valueText: "13.4" },
        { componentCode: "HB", valueText: "13.5" },
      ],
    }).success).toBe(false);
  });
  it("rejects a value without a component code", () => {
    expect(labResultDraftRequestSchema.safeParse({ values: [{ valueText: "13.4" }] }).success).toBe(false);
  });
  it("rejects non-finite numeric values", () => {
    expect(labResultDraftRequestSchema.safeParse({ values: [{ componentCode: "GLUCOSE", valueNumeric: Number.NaN }] }).success).toBe(false);
  });
  it("requires either a summary or at least one component value", () => {
    expect(labResultDraftRequestSchema.safeParse({ values: [] }).success).toBe(false);
    expect(labResultDraftRequestSchema.safeParse({ resultSummary: "No component panel" }).success).toBe(true);
  });
  it("rejects caller-supplied result status, author, or timestamp", () => {
    expect(labResultDraftRequestSchema.safeParse({ resultSummary: "Result", status: "RELEASED", authoredByEmployeeId: "forged", resultedAt: "2026-01-01" }).success).toBe(false);
  });
});
