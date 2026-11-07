import { getAuthSession } from "../../../../../server/auth/session";
import {
  assertEmailChangeJsonRequest,
  assertEmailChangeOrigin,
  emailChangeJson,
  toEmailChangeErrorResponse,
} from "../../../../../server/auth/email/email-change-http";
import { requestEmailChange, EmailChangeError } from "../../../../../server/auth/email/email-change";
import { emailChangeRequestSchema } from "../../../../../server/auth/email/email-change-validation";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    assertEmailChangeOrigin(request);
    assertEmailChangeJsonRequest(request);

    const session = await getAuthSession();
    if (!session) {
      throw new EmailChangeError("AUTHENTICATION_REQUIRED", "Sign in before changing your email address.", 401);
    }
    if (!session.user.emailVerified) {
      throw new EmailChangeError("VERIFIED_ACCOUNT_REQUIRED", "Verify your current email address first.", 403);
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = emailChangeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return emailChangeJson(
        { error: { code: "INVALID_REQUEST", message: "Enter a valid email address." } },
        400,
      );
    }

    await requestEmailChange(session.user.id, parsed.data.newEmail);
    return emailChangeJson(
      { ok: true, message: "A confirmation link was sent to your current email address." },
      202,
    );
  } catch (error) {
    return toEmailChangeErrorResponse(error);
  }
}
