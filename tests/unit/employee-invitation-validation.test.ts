import { describe, expect, it } from "vitest";

import {
  createEmployeeInvitationState,
  createEmployeeInvitationToken,
  employeeInvitationAcceptSchema,
  employeeInvitationRequestSchema,
  employeeInvitationRevokeSchema,
  employeeInvitationVerificationIdentifier,
  hashEmployeeInvitationToken,
  isEmployeeInvitationTokenValid,
  normalizeInvitationEmail,
  parseEmployeeInvitationState,
  serializeEmployeeInvitationState,
} from "../../src/server/auth/invitations/employee-invitation-validation";

describe("employee invitation validation", () => {
  it("normalizes invited email addresses", () => {
    expect(normalizeInvitationEmail("  STAFF@Example.COM ")).toBe("staff@example.com");
  });

  it("creates cryptographically random URL-safe invitation tokens", () => {
    const first = createEmployeeInvitationToken();
    const second = createEmployeeInvitationToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(second).not.toBe(first);
  });

  it("stores a digest rather than the raw invitation token", () => {
    const token = "meruno-test-token-that-is-long-enough-123456";
    const state = createEmployeeInvitationState({
      employeeId: "employee_123",
      invitedEmail: "STAFF@example.com",
      invitedByEmployeeId: "admin_123",
      token,
    });
    expect(state.tokenHash).toBe(hashEmployeeInvitationToken(token));
    expect(state.tokenHash).not.toContain(token);
  });

  it("validates the correct token", () => {
    const token = createEmployeeInvitationToken();
    const state = createEmployeeInvitationState({
      employeeId: "employee_123",
      invitedEmail: "staff@example.com",
      invitedByEmployeeId: "admin_123",
      token,
    });
    expect(isEmployeeInvitationTokenValid(state, token)).toBe(true);
  });

  it("rejects an incorrect token", () => {
    const token = createEmployeeInvitationToken();
    const state = createEmployeeInvitationState({
      employeeId: "employee_123",
      invitedEmail: "staff@example.com",
      invitedByEmployeeId: "admin_123",
      token,
    });
    expect(isEmployeeInvitationTokenValid(state, "incorrect-token-value-123456789012")).toBe(false);
  });

  it("serializes and parses a valid invitation state", () => {
    const state = createEmployeeInvitationState({
      employeeId: "employee_123",
      invitedEmail: "staff@example.com",
      invitedByEmployeeId: "admin_123",
      token: createEmployeeInvitationToken(),
    });
    expect(parseEmployeeInvitationState(serializeEmployeeInvitationState(state))).toEqual(state);
  });

  it("rejects malformed persisted JSON", () => {
    expect(parseEmployeeInvitationState("not-json")).toBeNull();
  });

  it("rejects persisted invitation state with an unsupported version or malformed digest", () => {
    expect(parseEmployeeInvitationState(JSON.stringify({
      version: 2,
      employeeId: "employee_123",
      invitedEmail: "staff@example.com",
      invitedByEmployeeId: "admin_123",
      tokenHash: "bad",
    }))).toBeNull();
  });

  it("uses a stable employee-scoped verification identifier", () => {
    expect(employeeInvitationVerificationIdentifier("employee_123")).toBe("meruno:employee-invitation:employee_123");
  });

  it("validates invitation issue, revoke, and accept requests", () => {
    expect(employeeInvitationRequestSchema.safeParse({ employeeId: "employee_123", reason: "Approved staff onboarding" }).success).toBe(true);
    expect(employeeInvitationRevokeSchema.safeParse({ employeeId: "employee_123", reason: "Invitation withdrawn" }).success).toBe(true);
    expect(employeeInvitationAcceptSchema.safeParse({ employeeId: "employee_123", token: "x".repeat(40) }).success).toBe(true);
    expect(employeeInvitationAcceptSchema.safeParse({ employeeId: "employee_123", token: "short" }).success).toBe(false);
  });
});
