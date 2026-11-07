import "server-only";

export type AuthEmailMode = "console" | "resend" | "disabled";
export interface AuthEmailMessage { to: string; subject: string; text: string; html: string; }

export function getAuthEmailMode(): AuthEmailMode {
  const configured = process.env.AUTH_EMAIL_MODE?.trim().toLowerCase();
  if (configured === "console" || configured === "resend" || configured === "disabled") return configured;
  return process.env.NODE_ENV === "production" ? "resend" : "console";
}

export function isAuthEmailDeliveryAvailable(): boolean {
  const mode = getAuthEmailMode();
  if (mode === "console") return process.env.NODE_ENV !== "production";
  if (mode === "resend") return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.AUTH_EMAIL_FROM?.trim());
  return false;
}

export async function sendAuthEmail(message: AuthEmailMessage): Promise<void> {
  const mode = getAuthEmailMode();
  if (mode === "disabled") throw new Error("Authentication email delivery is disabled.");
  if (mode === "console") {
    if (process.env.NODE_ENV === "production") throw new Error("Console email delivery is not allowed in production.");
    console.info("[MERUNO local auth email]", { to: message.to, subject: message.subject, text: message.text });
    return;
  }
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.AUTH_EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new Error("Resend delivery requires RESEND_API_KEY and AUTH_EMAIL_FROM to be configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Authentication email provider returned HTTP ${response.status}.`);
}
