import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import { accountLinkJson, toAccountLinkErrorResponse } from "../../../../../server/auth/account-linking/common";
import { getFinancialReport } from "../../../../../server/billing/billing-phase-9b";
import { billingReportQuerySchema } from "../../../../../server/billing/billing-phase-9b-validation";

export const runtime = "nodejs";
export async function GET(request: Request): Promise<Response> {
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.BILLING_READ, async (securedRequest) => {
    const url = new URL(securedRequest.url);
    const parsed = billingReportQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) return accountLinkJson({ error: { code: "INVALID_BILLING_REPORT_QUERY", message: "Provide a valid date range of no more than 93 days." } }, 400);
    const report = await getFinancialReport(parsed.data);
    return accountLinkJson({ success: true, report });
  }, toAccountLinkErrorResponse)(request);
}
