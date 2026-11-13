import { describe, expect, it } from "vitest";
import { getSystemRoleChangeBlocker } from "../../src/server/system-admin/policy";

const base = {
  action: "GRANT" as const,
  role: "DOCTOR" as const,
  activeSystemAdminCount: 2,
  targetEmployeeStatus: "ACTIVE" as const,
  targetActiveRoles: [] as const,
  targetHasVerifiedAccount: false,
};

describe("System Admin role assignment policy", () => {
  it("rejects role grants to employees who are not active", () => {
    expect(getSystemRoleChangeBlocker({ ...base, targetEmployeeStatus: "ON_LEAVE" })).toContain("active employees");
  });

  it("requires a verified linked account before granting System Admin", () => {
    expect(getSystemRoleChangeBlocker({ ...base, role: "SYSTEM_ADMIN" })).toContain("Link and verify");
    expect(getSystemRoleChangeBlocker({ ...base, role: "SYSTEM_ADMIN", targetHasVerifiedAccount: true })).toBeNull();
  });

  it("keeps Clinic Manager and System Admin as separate roles", () => {
    expect(getSystemRoleChangeBlocker({ ...base, role: "SYSTEM_ADMIN", targetActiveRoles: ["CLINIC_MANAGER"], targetHasVerifiedAccount: true })).toContain("must remain separate");
    expect(getSystemRoleChangeBlocker({ ...base, role: "CLINIC_MANAGER", targetActiveRoles: ["SYSTEM_ADMIN"] })).toContain("must remain separate");
  });

  it("prevents revoking the last verified active System Admin", () => {
    expect(getSystemRoleChangeBlocker({ ...base, action: "REVOKE", role: "SYSTEM_ADMIN", activeSystemAdminCount: 1 })).toContain("last verified active System Admin");
    expect(getSystemRoleChangeBlocker({ ...base, action: "REVOKE", role: "SYSTEM_ADMIN", activeSystemAdminCount: 2 })).toBeNull();
  });

  it("allows an ordinary role grant to an active employee", () => {
    expect(getSystemRoleChangeBlocker(base)).toBeNull();
  });
});
