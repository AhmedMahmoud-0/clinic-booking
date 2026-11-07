import { escapeEmailHtml, type AuthEmailContent } from "./email-content";

export function createEmployeeInvitationEmailContent(
  employeeName: string,
  invitationUrl: string,
): AuthEmailContent {
  const safeName = escapeEmailHtml(employeeName);
  const safeUrl = escapeEmailHtml(invitationUrl);
  const subject = "Your MERUNO Medical Clinics employee invitation";
  const description = `You have been invited to activate sign-in access for your existing MERUNO employee record, ${employeeName}. This invitation does not create a new employee record or assign roles.`;
  const footer = "This invitation expires after 72 hours. If you were not expecting it, you can ignore this message. Never forward this invitation link.";

  return {
    subject,
    text: `${subject}\n\n${description}\n\nAccept invitation: ${invitationUrl}\n\n${footer}`,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#f5f8f7;color:#24343b;font-family:Arial,sans-serif;padding:32px 16px"><main style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5eceb;border-radius:14px;padding:32px"><p style="color:#176b67;font-weight:700;letter-spacing:.12em">MERUNO MEDICAL CLINICS</p><h1 style="font-size:24px">Your employee invitation</h1><p style="line-height:1.7">Hello ${safeName},</p><p style="line-height:1.7">${escapeEmailHtml(description)}</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#176b67;color:#fff;text-decoration:none;padding:13px 20px;border-radius:8px;font-weight:700">Review invitation</a></p><p style="font-size:12px;line-height:1.6;color:#718187">${escapeEmailHtml(footer)}</p><p style="font-size:12px;color:#9aa8aa;overflow-wrap:anywhere">If the button does not work, copy this link: ${safeUrl}</p></main></body></html>`,
  };
}
