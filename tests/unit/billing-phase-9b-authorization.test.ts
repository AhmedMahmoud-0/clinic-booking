import { describe, expect, it } from "vitest";
import { getEmployeePermissions } from "../../src/server/auth/authorization/policy";
import { CLINIC_PERMISSIONS } from "../../src/server/auth/authorization/types";

describe("Phase 9B least-privilege billing authorization", () => {
  it("keeps discount/refund request and execution in Cashier scope", () => {
    const cashier = getEmployeePermissions(["CASHIER"]);
    expect(cashier).toContain(CLINIC_PERMISSIONS.INVOICE_MANAGE);
    expect(cashier).toContain(CLINIC_PERMISSIONS.REFUND_REQUEST);
    expect(cashier).toContain(CLINIC_PERMISSIONS.BILLING_READ);
    expect(cashier).not.toContain(CLINIC_PERMISSIONS.DISCOUNT_APPROVE);
    expect(cashier).not.toContain(CLINIC_PERMISSIONS.REFUND_APPROVE);
  });

  it("keeps discount/refund decisions and financial reporting in Clinic Manager scope", () => {
    const manager = getEmployeePermissions(["CLINIC_MANAGER"]);
    expect(manager).toContain(CLINIC_PERMISSIONS.DISCOUNT_APPROVE);
    expect(manager).toContain(CLINIC_PERMISSIONS.REFUND_APPROVE);
    expect(manager).toContain(CLINIC_PERMISSIONS.BILLING_READ);
    expect(manager).not.toContain(CLINIC_PERMISSIONS.PAYMENT_COLLECT);
    expect(manager).not.toContain(CLINIC_PERMISSIONS.INVOICE_MANAGE);
  });

  it("does not expose billing data or approvals to System Admin", () => {
    const admin = getEmployeePermissions(["SYSTEM_ADMIN"]);
    expect(admin).not.toContain(CLINIC_PERMISSIONS.BILLING_READ);
    expect(admin).not.toContain(CLINIC_PERMISSIONS.INVOICE_MANAGE);
    expect(admin).not.toContain(CLINIC_PERMISSIONS.REFUND_REQUEST);
    expect(admin).not.toContain(CLINIC_PERMISSIONS.DISCOUNT_APPROVE);
    expect(admin).not.toContain(CLINIC_PERMISSIONS.REFUND_APPROVE);
  });
});
