import { describe, expect, it } from "vitest";

import { createEmployeeInvitationEmailContent } from "../../src/server/auth/email/employee-invitation-content";

describe("employee invitation email content", () => {
  it("includes the invitation URL and expiry in the plain-text message", () => {
    const content = createEmployeeInvitationEmailContent("Sample Employee", "https://clinic.example/auth/employee-invitation?token=abc");
    expect(content.subject).toContain("employee invitation");
    expect(content.text).toContain("https://clinic.example/auth/employee-invitation?token=abc");
    expect(content.text).toContain("72 hours");
  });

  it("escapes employee names and invitation URLs in HTML", () => {
    const content = createEmployeeInvitationEmailContent("A&B <Employee>", "https://clinic.example/invite?x=1&y=2");
    expect(content.html).toContain("A&amp;B &lt;Employee&gt;");
    expect(content.html).toContain("x=1&amp;y=2");
    expect(content.html).not.toContain("A&B <Employee>");
  });

  it("states that invitations do not create employee records or roles", () => {
    const content = createEmployeeInvitationEmailContent("Sample Employee", "https://clinic.example/invite");
    expect(content.text).toContain("does not create a new employee record");
    expect(content.text).toContain("does not create a new employee record or assign roles");
  });
});
