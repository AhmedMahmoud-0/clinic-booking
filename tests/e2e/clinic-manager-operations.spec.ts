import { expect, test } from "@playwright/test";

const PAGES = [
  "/clinic-manager/complaints",
  "/clinic-manager/incidents",
  "/clinic-manager/billing/approvals",
  "/clinic-manager/reports/operations",
  "/clinic-manager/reports/financial",
];

test("Clinic Manager pages require an authorized employee session", async ({ page }) => {
  for (const route of PAGES) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  }
});

test("Reception complaint intake renders the state allowed by the authenticated actor", async ({ page }) => {
  await page.goto("/reception/complaints", { waitUntil: "domcontentloaded" });

  const intakeHeading = page.getByRole("heading", { name: "Record a complaint" });
  const restrictedHeading = page.getByRole("heading", { name: "Complaint intake is restricted" });
  // `isVisible()` is an immediate check, not a wait. Poll until the server
  // redirect or one of the two permission-gated page states is actually rendered.
  await expect.poll(async () => {
    if (/\/login(?:\?|$)/.test(page.url())) return "login";
    if (await intakeHeading.isVisible().catch(() => false)) return "intake";
    if (await restrictedHeading.isVisible().catch(() => false)) return "restricted";
    return "pending";
  }, { timeout: 15_000, intervals: [100, 250, 500, 1_000] }).not.toBe("pending");

  // Re-read the current rendered state after polling. This avoids relying on a
  // closure-mutated local variable whose assignments TypeScript cannot track.
  if (/\/login(?:\?|$)/.test(page.url())) {
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    return;
  }

  if (await intakeHeading.isVisible().catch(() => false)) {
    await expect(intakeHeading).toBeVisible();
    await expect(page.locator("form")).toBeVisible();
    await expect(page.getByRole("button", { name: "Record complaint" })).toBeVisible();
    await expect(restrictedHeading).toHaveCount(0);
    return;
  }

  await expect(restrictedHeading).toBeVisible();
  await expect(intakeHeading).toHaveCount(0);
  await expect(page.locator("form")).toHaveCount(0);
});

test("Clinic Manager complaint, incident, and report APIs reject anonymous access without caching", async ({ request }) => {
  for (const route of [
    "/api/clinic-manager/complaints",
    "/api/clinic-manager/incidents",
    "/api/clinic-manager/reports/operations?from=2026-11-01&to=2026-11-13",
  ]) {
    const response = await request.get(route);
    expect(response.status(), `${route} should reject anonymous access`).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});

test("complaint and incident mutation routes reject anonymous payloads before processing", async ({ request }) => {
  const complaint = await request.post("/api/clinic-manager/complaints/not-a-real-id/transition", { data: { status: "RESOLVED", note: "Anonymous attempt" } });
  expect(complaint.status()).toBe(401);
  expect(complaint.headers()["cache-control"]).toContain("no-store");

  const incident = await request.post("/api/clinic-manager/incidents", { data: { category: "OPERATIONAL", severity: "LOW", occurredAt: "2026-11-13T08:00:00.000Z", summary: "Anonymous incident", description: "This should be rejected before an incident is written." } });
  expect(incident.status()).toBe(401);
  expect(incident.headers()["cache-control"]).toContain("no-store");

  const receptionComplaint = await request.post("/api/reception/complaints", { data: {
    channel: "PHONE", category: "WAIT_TIME", subject: "Long waiting time",
    description: "The caller reported an extended wait before being checked in at the clinic.",
  } });
  expect(receptionComplaint.status()).toBe(401);
  expect(receptionComplaint.headers()["cache-control"]).toContain("no-store");
});

test("incident status updates reject anonymous requests", async ({ request }) => {
  const response = await request.post("/api/clinic-manager/incidents/not-a-real-id/transition", { data: { status: "CLOSED", note: "Anonymous attempt" } });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("Reception complaint intake is protected by its own employee permission", async ({ request }) => {
  const response = await request.post("/api/reception/complaints", { data: {
    channel: "IN_PERSON", category: "FACILITY", subject: "Waiting area concern",
    description: "The visitor reported that the waiting area seating needs attention today.",
    patientId: "forged-patient-id",
  } });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
