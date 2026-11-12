import { describe, expect, it } from "vitest";
import { getEmployeePermissions } from "../../src/server/auth/authorization/policy";
import { CLINIC_PERMISSIONS } from "../../src/server/auth/authorization/types";

describe("Phase 9A least-privilege billing permissions", () => {
  it("limits invoice creation/issuance and payment collection to Cashier", () => {
    const cashier = getEmployeePermissions(["CASHIER"]);
    const manager = getEmployeePermissions(["CLINIC_MANAGER"]);
    const systemAdmin = getEmployeePermissions(["SYSTEM_ADMIN"]);

    expect(cashier).toContain(CLINIC_PERMISSIONS.BILLING_READ);
    expect(cashier).toContain(CLINIC_PERMISSIONS.INVOICE_MANAGE);
    expect(cashier).toContain(CLINIC_PERMISSIONS.PAYMENT_COLLECT);
    expect(manager).toContain(CLINIC_PERMISSIONS.BILLING_READ);
    expect(manager).not.toContain(CLINIC_PERMISSIONS.INVOICE_MANAGE);
    expect(manager).not.toContain(CLINIC_PERMISSIONS.PAYMENT_COLLECT);
    expect(systemAdmin).not.toContain(CLINIC_PERMISSIONS.BILLING_READ);
    expect(systemAdmin).not.toContain(CLINIC_PERMISSIONS.INVOICE_MANAGE);
    expect(systemAdmin).not.toContain(CLINIC_PERMISSIONS.PAYMENT_COLLECT);
  });

  it("keeps discount/refund approvals with Clinic Manager, not Cashier", () => {
    const cashier = getEmployeePermissions(["CASHIER"]);
    const manager = getEmployeePermissions(["CLINIC_MANAGER"]);

    expect(cashier).toContain(CLINIC_PERMISSIONS.REFUND_REQUEST);
    expect(cashier).not.toContain(CLINIC_PERMISSIONS.DISCOUNT_APPROVE);
    expect(cashier).not.toContain(CLINIC_PERMISSIONS.REFUND_APPROVE);
    expect(manager).toContain(CLINIC_PERMISSIONS.DISCOUNT_APPROVE);
    expect(manager).toContain(CLINIC_PERMISSIONS.REFUND_APPROVE);
    expect(manager).not.toContain(CLINIC_PERMISSIONS.PAYMENT_COLLECT);
  });
});
