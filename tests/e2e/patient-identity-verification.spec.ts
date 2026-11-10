import { expect, test } from "@playwright/test";

const configuredAuthUrl = process.env.BETTER_AUTH_URL;
if (!configuredAuthUrl) {
  throw new Error("BETTER_AUTH_URL must be available to the E2E test process.");
}
const origin = new URL(configuredAuthUrl).origin;

test("patient identity verification requires an authorized employee session", async ({ request }) => {
  const response = await request.post(
    "/api/clinic/patients/synthetic-patient/identity-verifications",
    {
      headers: { Origin: origin },
      data: {
        firstIdentifier: { type: "FULL_NAME", value: "Synthetic Patient" },
        secondIdentifier: { type: "MRN", value: "MRN-2026-SYNTHETIC" },
      },
    },
  );

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
