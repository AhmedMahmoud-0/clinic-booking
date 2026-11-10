import { expect, test } from "@playwright/test";

const configuredAuthUrl = process.env.BETTER_AUTH_URL;
if (!configuredAuthUrl) {
  throw new Error("BETTER_AUTH_URL must be available to the E2E test process.");
}

const origin = new URL(configuredAuthUrl).origin;

const patientInput = {
  firstName: "E2E",
  lastName: "Patient",
  dateOfBirth: "1990-01-01",
  phone: "+20 100 000 0000",
};

test("patient duplicate-check endpoint requires the reception patient-management permission", async ({ request }) => {
  const response = await request.post("/api/reception/patients/duplicate-check", {
    headers: { Origin: origin },
    data: patientInput,
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("patient registration requires an authorized employee session", async ({ request }) => {
  const response = await request.post("/api/reception/patients", {
    headers: { Origin: origin },
    data: {
      ...patientInput,
      identityElements: ["FULL_NAME", "DATE_OF_BIRTH"],
    },
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
