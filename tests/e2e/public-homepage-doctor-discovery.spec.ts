import { expect, test } from "@playwright/test";

test("homepage gives visitors direct routes to booking, doctors, and specialties", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("home-book-appointment")).toHaveAttribute("href", "/book-appointment");
  await expect(page.getByTestId("home-find-doctor")).toHaveAttribute("href", "/doctors");
  await expect(page.getByTestId("home-explore-specialties")).toHaveAttribute("href", "/specialties");
  await expect(page.getByTestId("home-account-sign-in")).toHaveAttribute("href", "/login");

  const specialtyCards = page.getByTestId("home-specialty-card");
  await expect(specialtyCards).toHaveCount(7);
  await expect(specialtyCards.first()).toHaveAttribute("href", /^\/specialties\//);
  await specialtyCards.first().click();
  await expect(page).toHaveURL(/\/specialties\/[^/?]+$/);
  await expect(page.getByRole("heading", { level: 2, name: "Doctors in this specialty" })).toBeVisible();
  await expect(page.getByTestId("specialty-doctor-card").first()).toBeVisible();
});

test("doctor directory shows individual portraits and the full card opens the profile", async ({ page }) => {
  await page.goto("/doctors");

  const doctorCards = page.getByTestId("doctor-card");
  await expect(doctorCards).toHaveCount(8);

  const firstCard = doctorCards.first();
  const profileLink = firstCard.getByTestId("doctor-card-main-link");
  const profileHref = await profileLink.getAttribute("href");
  expect(profileHref).toMatch(/^\/doctors\//);
  await expect(doctorCards.getByTestId("doctor-portrait").locator("img")).toHaveCount(8);
  await expect(firstCard.getByRole("link", { name: "Book", exact: true })).toHaveAttribute("href", /^\/book-appointment\?doctorId=/);

  await firstCard.click();
  await expect(page).toHaveURL(/\/doctors\/[^/?]+$/);
  await expect(page.getByTestId("doctor-portrait").locator("img")).toBeVisible();
  await expect(page.getByRole("link", { name: /book an appointment/i })).toBeVisible();
});

test("homepage and doctor directory stay within narrow mobile widths", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const route of ["/", "/doctors", "/specialties"]) {
    await page.goto(route);
    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.documentWidth, `Unexpected horizontal overflow on ${route}`).toBeLessThanOrEqual(dimensions.viewportWidth);
  }
});
