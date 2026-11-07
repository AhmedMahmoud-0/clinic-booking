import { describe, expect, it } from "vitest";
import { createPasswordResetEmailContent, createVerificationEmailContent, escapeEmailHtml } from "../../src/server/auth/email/email-content";

describe("MERUNO authentication email content", () => {
  it("creates a verification email with the exact generated link", () => {
    const content = createVerificationEmailContent("https://clinic.example/verify?token=abc");
    expect(content.subject).toContain("Verify");
    expect(content.text).toContain("https://clinic.example/verify?token=abc");
    expect(content.html).toContain("https://clinic.example/verify?token=abc");
  });
  it("escapes HTML-sensitive characters in the verification link", () => {
    const content = createVerificationEmailContent('https://clinic.example/verify?x="<tag>&');
    expect(content.html).toContain("&quot;&lt;tag&gt;&amp;");
    expect(content.html).not.toContain('x="<tag>&');
  });
  it("states the verification-link expiry and safe ignore behavior", () => {
    const content = createVerificationEmailContent("https://clinic.example/verify?token=abc");
    expect(content.text).toContain("24 hours");
    expect(content.text).toContain("ignore this email");
  });
  it("creates a password reset message with the provided reset URL", () => {
    const content = createPasswordResetEmailContent("https://clinic.example/reset?token=reset-token");
    expect(content.subject).toContain("password");
    expect(content.text).toContain("reset-token");
    expect(content.text).toContain("1 hour");
  });
  it("escapes password reset links before inserting them into HTML", () => {
    const content = createPasswordResetEmailContent("https://clinic.example/reset?a=1&b=2");
    expect(content.html).toContain("a=1&amp;b=2");
  });
  it("escapes all core HTML characters", () => {
    expect(escapeEmailHtml(`A&B <C> \"D\" 'E'`)).toBe("A&amp;B &lt;C&gt; &quot;D&quot; &#39;E&#39;");
  });
});
