import { describe, expect, it } from "vitest";
import { averageMinutes, canTransitionComplaint, canTransitionIncident, getCairoReportWindow } from "../../src/server/clinic-manager/operations-policy";
import { hasEmployeePermission } from "../../src/server/auth/authorization/policy";
import { CLINIC_PERMISSIONS } from "../../src/server/auth/authorization/types";
import { cairoDateKey, cairoDateTime } from "../../src/server/clinic-manager/overview-policy";
import { complaintTransitionSchema, createIncidentSchema, createReceptionComplaintSchema, incidentTransitionSchema, operationalReportQuerySchema } from "../../src/server/clinic-manager/operations-validation";

describe("Clinic Manager complaint workflow policy", () => {
  it("allows only explicit complaint status transitions", () => {
    expect(canTransitionComplaint("RECEIVED", "ACKNOWLEDGED")).toBe(true);
    expect(canTransitionComplaint("RESOLVED", "IN_REVIEW")).toBe(true);
    expect(canTransitionComplaint("CLOSED", "IN_REVIEW")).toBe(false);
    expect(canTransitionComplaint("REJECTED", "RESOLVED")).toBe(false);
  });

  it("requires an explanatory note for terminal complaint decisions", () => {
    expect(complaintTransitionSchema.safeParse({ status: "ACKNOWLEDGED" }).success).toBe(true);
    expect(complaintTransitionSchema.safeParse({ status: "RECEIVED" }).success).toBe(false);
    expect(complaintTransitionSchema.safeParse({ status: "RESOLVED" }).success).toBe(false);
    expect(complaintTransitionSchema.safeParse({ status: "REJECTED", note: "Not a valid clinic complaint" }).success).toBe(true);
    expect(complaintTransitionSchema.safeParse({ status: "CLOSED", note: "closed", patientId: "forged" }).success).toBe(false);
  });
});

describe("Clinic Manager incident workflow policy", () => {
  it("keeps incident transitions explicit and closed incidents terminal", () => {
    expect(canTransitionIncident("REPORTED", "UNDER_REVIEW")).toBe(true);
    expect(canTransitionIncident("ACTION_REQUIRED", "RESOLVED")).toBe(true);
    expect(canTransitionIncident("CLOSED", "UNDER_REVIEW")).toBe(false);
  });

  it("validates incident reports and rejects client-selected ownership", () => {
    const valid = {
      category: "OPERATIONAL", severity: "MODERATE", occurredAt: "2026-11-13T08:30:00.000Z",
      summary: "Clinic network interruption", description: "The appointment desk lost network connectivity for approximately twelve minutes.",
    };
    expect(createIncidentSchema.safeParse(valid).success).toBe(true);
    expect(createIncidentSchema.safeParse({ ...valid, reportedByEmployeeId: "forged" }).success).toBe(false);
    expect(createIncidentSchema.safeParse({ ...valid, severity: "EXTREME" }).success).toBe(false);
    expect(incidentTransitionSchema.safeParse({ status: "REPORTED" }).success).toBe(false);
    expect(incidentTransitionSchema.safeParse({ status: "RESOLVED" }).success).toBe(false);
    expect(incidentTransitionSchema.safeParse({ status: "RESOLVED", note: "Service restored and verified" }).success).toBe(true);
  });
});

describe("Clinic Manager Cairo reporting policy", () => {
  it("uses Cairo calendar boundaries rather than the host UTC day", () => {
    const lateUtc = new Date("2026-11-12T22:30:00.000Z");
    expect(cairoDateKey(lateUtc)).toBe("2026-11-13");
    const window = getCairoReportWindow("2026-11-13", "2026-11-13");
    expect(cairoDateKey(window.startsAt)).toBe("2026-11-13");
    expect(cairoDateKey(new Date(window.endsAt.getTime() - 1))).toBe("2026-11-13");
    expect(cairoDateTime("2026-11-13").getTime()).toBe(window.startsAt.getTime());
  });

  it("limits date ranges to 93 calendar days and rejects malformed dates", () => {
    expect(operationalReportQuerySchema.safeParse({ from: "2026-01-01", to: "2026-04-03" }).success).toBe(true);
    expect(operationalReportQuerySchema.safeParse({ from: "2026-01-01", to: "2026-04-04" }).success).toBe(false);
    expect(operationalReportQuerySchema.safeParse({ from: "2026-02-30", to: "2026-03-01" }).success).toBe(false);
  });

  it("returns null for empty duration samples and ignores invalid negative durations", () => {
    expect(averageMinutes([])).toBeNull();
    expect(averageMinutes([{ startedAt: new Date("2026-11-13T10:00:00Z"), endedAt: new Date("2026-11-13T10:30:00Z") }])).toBe(30);
    expect(averageMinutes([{ startedAt: new Date("2026-11-13T11:00:00Z"), endedAt: new Date("2026-11-13T10:30:00Z") }])).toBeNull();
  });
});


describe("Reception complaint intake validation", () => {
  const valid = {
    channel: "PHONE",
    category: "WAIT_TIME",
    subject: "Long waiting time",
    description: "The caller reported an extended wait before being checked in at the clinic.",
    submitterName: "Demo Caller",
    submitterPhone: "+201000000000",
  };

  it("accepts telephone and in-person complaint intake", () => {
    expect(createReceptionComplaintSchema.safeParse(valid).success).toBe(true);
    expect(createReceptionComplaintSchema.safeParse({ ...valid, channel: "IN_PERSON" }).success).toBe(true);
  });

  it("rejects caller-selected patient, ownership, status, and reference fields", () => {
    expect(createReceptionComplaintSchema.safeParse({ ...valid, patientId: "another-patient" }).success).toBe(false);
    expect(createReceptionComplaintSchema.safeParse({ ...valid, createdByEmployeeId: "forged" }).success).toBe(false);
    expect(createReceptionComplaintSchema.safeParse({ ...valid, status: "CLOSED" }).success).toBe(false);
    expect(createReceptionComplaintSchema.safeParse({ ...valid, referenceNumber: "MER-CMP-FORGED" }).success).toBe(false);
  });

  it("requires a sufficiently detailed complaint and validates contact email", () => {
    expect(createReceptionComplaintSchema.safeParse({ ...valid, description: "Too short" }).success).toBe(false);
    expect(createReceptionComplaintSchema.safeParse({ ...valid, submitterEmail: "not-an-email" }).success).toBe(false);
  });
});


describe("Reception and manager complaint permission separation", () => {
  it("allows Reception intake while denying it to other clinic roles", () => {
    expect(hasEmployeePermission(["RECEPTION"], CLINIC_PERMISSIONS.COMPLAINT_INTAKE)).toBe(true);
    expect(hasEmployeePermission(["RECEPTION"], CLINIC_PERMISSIONS.COMPLAINT_MANAGE)).toBe(false);
    expect(hasEmployeePermission(["CLINIC_MANAGER"], CLINIC_PERMISSIONS.COMPLAINT_MANAGE)).toBe(true);
    expect(hasEmployeePermission(["CLINIC_MANAGER"], CLINIC_PERMISSIONS.COMPLAINT_INTAKE)).toBe(false);

    for (const role of ["DOCTOR", "NURSE", "LAB_STAFF", "RADIOLOGY_STAFF", "RADIOLOGIST", "CASHIER", "SYSTEM_ADMIN"]) {
      expect(hasEmployeePermission([role], CLINIC_PERMISSIONS.COMPLAINT_INTAKE), role).toBe(false);
    }
  });
});
