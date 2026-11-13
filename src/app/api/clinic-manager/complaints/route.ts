import { withEmployeePermissionRoute } from "@/server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "@/server/auth/authorization/types";
import { clinicManagerJson } from "@/server/clinic-manager/http";
import { getClinicManagerComplaints } from "@/server/clinic-manager/operations";
import { complaintListQuerySchema } from "@/server/clinic-manager/operations-validation";

export const runtime = "nodejs";

export const GET = withEmployeePermissionRoute(
  CLINIC_PERMISSIONS.COMPLAINT_MANAGE,
  async (request): Promise<Response> => {
    const url = new URL(request.url);
    const parsed = complaintListQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) return clinicManagerJson({ error: { code: "INVALID_COMPLAINT_FILTER", message: "Choose a valid complaint status." } }, 400);
    const complaints = await getClinicManagerComplaints(parsed.data.status);
    return clinicManagerJson({ success: true, complaints });
  },
);
