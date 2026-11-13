import { expect, test } from "@playwright/test";

test("public specialty and doctor directories are reachable", async ({ page }) => {
  await page.goto("/specialties");
  await expect(page.getByRole("heading", { level: 1, name: "Our medical specialties" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Doctors", exact: true }).first()).toHaveAttribute("href", "/doctors");

  await page.goto("/doctors");
  await expect(page.getByRole("heading", { level: 1, name: "Our doctors" })).toBeVisible();
  await expect(page.getByLabel("Search doctors")).toBeVisible();
  await expect(page.getByLabel("Specialty", { exact: true })).toBeVisible();
});

test("the full specialty card opens its details page", async ({ page }) => {
  await page.goto("/specialties");

  const firstSpecialtyCard = page.getByTestId("specialty-card-link").first();
  await expect(firstSpecialtyCard).toBeVisible();
  await expect(firstSpecialtyCard).toHaveAttribute("href", /^\/specialties\/[^/]+$/);
  await expect(firstSpecialtyCard.getByText("Explore", { exact: false })).toBeVisible();

  // Click the card heading rather than the Explore affordance to verify the whole card is interactive.
  await firstSpecialtyCard.locator("h2").click();
  await expect(page).toHaveURL(/\/specialties\/[^/?]+$/);
  await expect(page.getByRole("heading", { level: 2, name: "Doctors in this specialty" })).toBeVisible();
});

test("public information pages are reachable without invented contact details", async ({ page }) => {
  await page.goto("/faq");
  await expect(page.getByRole("heading", { level: 1, name: "Frequently asked questions" })).toBeVisible();
  await expect(page.getByText(/guest booking does not create a patient record/i)).toBeVisible();

  await page.goto("/contact");
  await expect(page.getByRole("heading", { level: 1, name: "How can we help?" })).toBeVisible();
  await expect(page.getByText(/Contact details are not configured/i)).toBeVisible();
  await expect(page.getByText(/\+20|info@|New Cairo|Cairo, Egypt/i)).toHaveCount(0);

  await page.goto("/privacy");
  await expect(page.getByText(/Draft for demonstration only/i)).toBeVisible();
  await page.goto("/terms");
  await expect(page.getByText(/Draft for demonstration only/i)).toBeVisible();
});

test("appointment booking presents the five approved stages", async ({ page }) => {
  await page.goto("/book-appointment");
  await expect(page.getByRole("heading", { level: 1, name: "Book an appointment" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Booking steps" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Choose a specialty" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
});

test("patient booking context denies anonymous callers", async ({ request }) => {
  const response = await request.get("/api/patient/booking-context");
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});


test("new public pages fit narrow mobile widths", async ({ page }) => {
  for (const route of ["/specialties", "/doctors", "/faq", "/contact", "/privacy", "/terms", "/book-appointment"]) {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(route);
    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.documentWidth, `Unexpected horizontal overflow on ${route}`).toBeLessThanOrEqual(dimensions.viewportWidth);
  }
});
