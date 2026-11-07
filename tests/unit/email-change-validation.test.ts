import { describe, expect, it } from "vitest";
import {
  createEmailChangeToken,
  createPendingEmailChange,
  emailChangeVerificationIdentifier,
  hashEmailChangeToken,
  isEmailChangeTokenValid,
  normalizeEmailAddress,
  parsePendingEmailChange,
  serializePendingEmailChange,
} from "../../src/server/auth/email/email-change-validation";

const currentEmail = "current@example.com";
const newEmail = "new@example.com";

describe("MERUNO email-change token state", () => {
  it("normalizes addresses using the existing lowercase email convention", () => {
    expect(normalizeEmailAddress("  New.User@Example.COM ")).toBe("new.user@example.com");
  });

  it("creates a high-entropy URL-safe token", () => {
    const token = createEmailChangeToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(createEmailChangeToken()).not.toBe(token);
  });

  it("stores only a SHA-256 token digest in the pending state", () => {
    const token = createEmailChangeToken();
    const state = createPendingEmailChange({ step: "CURRENT_EMAIL_APPROVAL", token, currentEmail, newEmail });
    expect(state.tokenHash).toBe(hashEmailChangeToken(token));
    expect(state.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(state)).not.toContain(token);
  });

  it("validates the token using its stored digest", () => {
    const token = createEmailChangeToken();
    const state = createPendingEmailChange({ step: "CURRENT_EMAIL_APPROVAL", token, currentEmail, newEmail });
    expect(isEmailChangeTokenValid(state, token)).toBe(true);
  });

  it("rejects a different token", () => {
    const state = createPendingEmailChange({ step: "CURRENT_EMAIL_APPROVAL", token: createEmailChangeToken(), currentEmail, newEmail });
    expect(isEmailChangeTokenValid(state, createEmailChangeToken())).toBe(false);
  });

  it("normalizes both addresses in a newly created state", () => {
    const state = createPendingEmailChange({
      step: "NEW_EMAIL_VERIFICATION",
      token: createEmailChangeToken(),
      currentEmail: " Current@Example.com ",
      newEmail: " New@Example.com ",
    });
    expect(state.currentEmail).toBe(currentEmail);
    expect(state.newEmail).toBe(newEmail);
  });

  it("round-trips a valid pending state", () => {
    const state = createPendingEmailChange({ step: "NEW_EMAIL_VERIFICATION", token: createEmailChangeToken(), currentEmail, newEmail });
    expect(parsePendingEmailChange(serializePendingEmailChange(state))).toEqual(state);
  });

  it("rejects malformed serialized state", () => {
    expect(parsePendingEmailChange("not-json")).toBeNull();
    expect(parsePendingEmailChange("{} ")).toBeNull();
  });

  it("rejects a state with a malformed token digest", () => {
    const value = JSON.stringify({
      version: 1,
      step: "CURRENT_EMAIL_APPROVAL",
      tokenHash: "not-a-hash",
      currentEmail,
      newEmail,
    });
    expect(parsePendingEmailChange(value)).toBeNull();
  });

  it("uses a namespaced verification identifier for each account", () => {
    expect(emailChangeVerificationIdentifier("user_123")).toBe("meruno:email-change:user_123");
  });
});
