import { expect, test } from "@playwright/test";

test("login page provides email/password sign-in and patient registration entry", async ({ page }) => {
  // Wait for the document, not every resource (fonts/dev tooling) to finish loading.
  await page.goto("/login", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { level: 2, name: "Welcome back" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toHaveAttribute("type", "email");
  await expect(
    page.getByRole("textbox", { name: "Password", exact: true }),
  ).toHaveAttribute("type", "password");
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /create a patient sign-in account/i }),
  ).toHaveAttribute("href", "/register");
  await expect(
    page.getByRole("link", { name: /forgot password/i }),
  ).toHaveAttribute("href", "/forgot-password");
});

test("login page has no horizontal overflow on narrow mobile widths", async ({ page }) => {
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));

    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  }
});

test("account status requires an authenticated session", async ({ page }) => {
  // Make the anonymous precondition explicit even if a runner supplies saved state.
  await page.context().clearCookies();
  expect(await page.context().cookies()).toHaveLength(0);

  await page.goto("/auth/account-status", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { level: 2, name: "Welcome back" }),
  ).toBeVisible();
});
