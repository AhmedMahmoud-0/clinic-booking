import {
  assertEmailChangeJsonRequest,
  assertEmailChangeOrigin,
  emailChangeJson,
  toEmailChangeErrorResponse,
} from "../../../../../server/auth/email/email-change-http";
import { completeEmailChange } from "../../../../../server/auth/email/email-change";
import { emailChangeTokenSchema } from "../../../../../server/auth/email/email-change-validation";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    assertEmailChangeOrigin(request);
    assertEmailChangeJsonRequest(request);
    const body: unknown = await request.json().catch(() => null);
    const parsed = emailChangeTokenSchema.safeParse(body);
    if (!parsed.success) {
      return emailChangeJson(
        { error: { code: "INVALID_REQUEST", message: "This email-change link is invalid or has expired." } },
        410,
      );
    }

    await completeEmailChange(parsed.data.userId, parsed.data.token);
    return emailChangeJson({ ok: true });
  } catch (error) {
    return toEmailChangeErrorResponse(error);
  }
}
