import { withPatientPortalRoute } from "../../../../server/auth/authorization/route-guards";
import {
  accountLinkJson,
  toAccountLinkErrorResponse,
} from "../../../../server/auth/account-linking/common";
import { getPrismaClient } from "../../../../server/db/client";
import { buildBookablePatientOptions } from "../../../../server/appointments/patient-booking-context-policy";

export const runtime = "nodejs";

/**
 * Returns only the authenticated patient's own active identity and subjects
 * with a currently valid BOOK_APPOINTMENTS grant. It does not expose medical
 * information or accept a patient ID from the client.
 */
export const GET = withPatientPortalRoute(
  async (_request, actor): Promise<Response> => {
    const prisma = getPrismaClient();
    const now = new Date();
    const [self, grants] = await Promise.all([
      prisma.patient.findUnique({
        where: { id: actor.patientId },
        select: { id: true, firstName: true, lastName: true, isActive: true },
      }),
      prisma.patientAccessGrant.findMany({
        where: {
          granteePatientId: actor.patientId,
          status: "ACTIVE",
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          permissions: { some: { scope: "BOOK_APPOINTMENTS" } },
        },
        orderBy: { updatedAt: "desc" },
        take: 100,
        select: {
          status: true,
          verifiedAt: true,
          verifiedByEmployeeId: true,
          expiresAt: true,
          revokedAt: true,
          approvedByPatientId: true,
          approvedAt: true,
          permissions: { select: { scope: true } },
          subjectPatient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              isActive: true,
              dateOfBirth: true,
            },
          },
          relationship: {
            select: {
              relationshipType: true,
              isActive: true,
              isLegalGuardian: true,
              guardianVerifiedAt: true,
              guardianVerifiedByEmployeeId: true,
            },
          },
        },
      }),
    ]);

    if (!self) {
      return accountLinkJson(
        { error: { code: "PATIENT_BOOKING_CONTEXT_UNAVAILABLE", message: "Your patient booking profile is unavailable. Contact the clinic for assistance." } },
        403,
      );
    }

    const patients = buildBookablePatientOptions({
      actor: self,
      now,
      grants: grants.map((record) => ({
        subjectPatient: record.subjectPatient,
        relationshipType: record.relationship.relationshipType,
        grant: {
          status: record.status,
          verifiedAt: record.verifiedAt,
          verifiedByEmployeeId: record.verifiedByEmployeeId,
          expiresAt: record.expiresAt,
          revokedAt: record.revokedAt,
          approvedByPatientId: record.approvedByPatientId,
          approvedAt: record.approvedAt,
          scopes: record.permissions.map((permission) => permission.scope),
          relationshipIsActive: record.relationship.isActive,
          relationshipIsLegalGuardian: record.relationship.isLegalGuardian,
          relationshipGuardianVerifiedAt: record.relationship.guardianVerifiedAt,
          relationshipGuardianVerifiedByEmployeeId: record.relationship.guardianVerifiedByEmployeeId,
        },
      })),
    });

    return accountLinkJson({ patients });
  },
  toAccountLinkErrorResponse,
);
