import { describe, expect, it } from "vitest";

import { getPostSignInDestinations } from "../../src/server/auth/authorization/post-sign-in-destination";
import type { CurrentAuthActor } from "../../src/server/auth/authorization/types";

function actor(overrides: Partial<CurrentAuthActor> = {}): CurrentAuthActor {
  return {
    userId: "user-demo",
    emailVerified: true,
    employee: null,
    patient: null,
    ...overrides,
  };
}

describe("post-sign-in destination resolution", () => {
  it("routes an active System Admin only to the technical workspace", () => {
    const destinations = getPostSignInDestinations(
      actor({ employee: { employeeId: "employee-demo", roles: ["SYSTEM_ADMIN"] } }),
    );

    expect(destinations).toHaveLength(1);
    expect(destinations[0]).toMatchObject({
      kind: "employee",
      workspace: "SYSTEM_ADMIN",
      href: "/system-admin",
    });
  });

  it("routes a verified patient only to the patient portal", () => {
    const destinations = getPostSignInDestinations(
      actor({ patient: { patientId: "patient-demo" } }),
    );

    expect(destinations).toHaveLength(1);
    expect(destinations[0]).toMatchObject({ kind: "patient", href: "/portal" });
  });

  it("offers an explicit choice when an account has multiple implemented workspaces", () => {
    const destinations = getPostSignInDestinations(
      actor({
        employee: { employeeId: "employee-demo", roles: ["SYSTEM_ADMIN", "CLINIC_MANAGER"] },
        patient: { patientId: "patient-demo" },
      }),
    );

    expect(destinations.map(({ href }) => href)).toEqual([
      "/system-admin",
      "/clinic-manager",
      "/portal",
    ]);
  });

  it("does not invent a landing page for a staff role without an implemented workspace route", () => {
    const destinations = getPostSignInDestinations(
      actor({ employee: { employeeId: "employee-demo", roles: ["RADIOLOGIST"] } }),
    );

    expect(destinations).toEqual([]);
  });

  it("does not invent a workspace for an account without an active clinic identity", () => {
    expect(getPostSignInDestinations(actor())).toEqual([]);
  });
});
