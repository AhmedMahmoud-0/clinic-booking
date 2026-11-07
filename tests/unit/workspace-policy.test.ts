import { describe, expect, it } from "vitest";

import { canAccessEmployeeWorkspace } from "../../src/server/auth/authorization/workspace-policy";

describe("MERUNO employee workspace access policy", () => {
  it("allows Reception into the reception workspace only", () => {
    expect(canAccessEmployeeWorkspace(["RECEPTION"], "RECEPTION")).toBe(true);
    expect(canAccessEmployeeWorkspace(["RECEPTION"], "DOCTOR")).toBe(false);
    expect(canAccessEmployeeWorkspace(["RECEPTION"], "NURSE")).toBe(false);
  });

  it("allows a Doctor into the doctor workspace without technical admin access", () => {
    expect(canAccessEmployeeWorkspace(["DOCTOR"], "DOCTOR")).toBe(true);
    expect(canAccessEmployeeWorkspace(["DOCTOR"], "SYSTEM_ADMIN")).toBe(false);
  });

  it("allows a Nurse into the nurse workspace but not the doctor workspace", () => {
    expect(canAccessEmployeeWorkspace(["NURSE"], "NURSE")).toBe(true);
    expect(canAccessEmployeeWorkspace(["NURSE"], "DOCTOR")).toBe(false);
  });

  it("allows Lab Staff into the laboratory workspace only", () => {
    expect(canAccessEmployeeWorkspace(["LAB_STAFF"], "LABORATORY")).toBe(true);
    expect(canAccessEmployeeWorkspace(["LAB_STAFF"], "RADIOLOGY")).toBe(false);
  });

  it("allows Radiology Staff into radiology without granting report approval", () => {
    expect(canAccessEmployeeWorkspace(["RADIOLOGY_STAFF"], "RADIOLOGY")).toBe(true);
  });

  it("allows Radiologists into radiology for report approval", () => {
    expect(canAccessEmployeeWorkspace(["RADIOLOGIST"], "RADIOLOGY")).toBe(true);
    expect(canAccessEmployeeWorkspace(["RADIOLOGIST"], "LABORATORY")).toBe(false);
  });

  it("allows Cashier into billing without clinical workspace access", () => {
    expect(canAccessEmployeeWorkspace(["CASHIER"], "CASHIER")).toBe(true);
    expect(canAccessEmployeeWorkspace(["CASHIER"], "DOCTOR")).toBe(false);
  });

  it("keeps Clinic Manager in the operational workspace, separate from System Admin", () => {
    expect(canAccessEmployeeWorkspace(["CLINIC_MANAGER"], "CLINIC_MANAGER")).toBe(true);
    expect(canAccessEmployeeWorkspace(["CLINIC_MANAGER"], "SYSTEM_ADMIN")).toBe(false);
  });

  it("allows System Admin into system administration without clinical access", () => {
    expect(canAccessEmployeeWorkspace(["SYSTEM_ADMIN"], "SYSTEM_ADMIN")).toBe(true);
    expect(canAccessEmployeeWorkspace(["SYSTEM_ADMIN"], "DOCTOR")).toBe(false);
  });

  it("supports employees with multiple explicitly assigned roles", () => {
    expect(canAccessEmployeeWorkspace(["RECEPTION", "CASHIER"], "RECEPTION")).toBe(true);
    expect(canAccessEmployeeWorkspace(["RECEPTION", "CASHIER"], "CASHIER")).toBe(true);
    expect(canAccessEmployeeWorkspace(["RECEPTION", "CASHIER"], "DOCTOR")).toBe(false);
  });

  it("fails closed for unknown role values", () => {
    expect(canAccessEmployeeWorkspace(["UNKNOWN_ROLE"], "SYSTEM_ADMIN")).toBe(false);
    expect(canAccessEmployeeWorkspace([], "RECEPTION")).toBe(false);
  });
});
