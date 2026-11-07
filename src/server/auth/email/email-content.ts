export interface AuthEmailContent { subject: string; text: string; html: string; }

export function escapeEmailHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

function actionEmail(title: string, description: string, buttonLabel: string, url: string, footer: string): AuthEmailContent {
  const safe = (value: string) => escapeEmailHtml(value);
  const safeUrl = safe(url);
  return {
    subject: title,
    text: `${title}\n\n${description}\n\n${buttonLabel}: ${url}\n\n${footer}`,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#f5f8f7;color:#24343b;font-family:Arial,sans-serif;padding:32px 16px"><main style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5eceb;border-radius:14px;padding:32px"><p style="color:#176b67;font-weight:700;letter-spacing:.12em">MERUNO MEDICAL CLINICS</p><h1 style="font-size:24px">${safe(title)}</h1><p style="line-height:1.7">${safe(description)}</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#176b67;color:#fff;text-decoration:none;padding:13px 20px;border-radius:8px;font-weight:700">${safe(buttonLabel)}</a></p><p style="font-size:12px;line-height:1.6;color:#718187">${safe(footer)}</p><p style="font-size:12px;color:#9aa8aa;overflow-wrap:anywhere">If the button does not work, copy this link: ${safeUrl}</p></main></body></html>`,
  };
}

export function createVerificationEmailContent(url: string): AuthEmailContent {
  return actionEmail("Verify your MERUNO email address", "Confirm that this email address belongs to you to activate your MERUNO sign-in account.", "Verify email address", url, "This verification link expires after 24 hours. If you did not create this account, you can ignore this email.");
}

export function createPasswordResetEmailContent(url: string): AuthEmailContent {
  return actionEmail("Reset your MERUNO password", "A password reset was requested for your MERUNO sign-in account.", "Reset password", url, "This link expires after 1 hour. If you did not request a password reset, you can ignore this email. Your current password will remain unchanged.");
}

export function createEmailChangeCurrentApprovalContent(url: string, newEmail: string): AuthEmailContent {
  return actionEmail(
    "Approve your MERUNO email change",
    `A request was made to change your MERUNO sign-in email to ${newEmail}. Approve this request only if you initiated it.`,
    "Approve email change",
    url,
    "This approval link expires after 15 minutes. If you did not request this change, ignore this message. Your email address remains unchanged unless the new address is also verified.",
  );
}

export function createEmailChangeNewAddressContent(url: string): AuthEmailContent {
  return actionEmail(
    "Verify your new MERUNO email address",
    "Your current email address was approved for a change. Verify this new address to complete the update to your MERUNO sign-in identity and linked clinic contact records.",
    "Verify new email address",
    url,
    "This verification link expires after 1 hour. If you did not request this change, ignore this message. Your sign-in email remains unchanged until this address is verified.",
  );
}
