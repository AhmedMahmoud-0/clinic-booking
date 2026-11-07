import { expect, test } from "@playwright/test";

test("patient registration page explains that it does not create or link a clinic record", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("heading", { level: 2, name: "Create your account" })).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Password", exact: true })).toHaveAttribute("minlength", "12");
  await expect(page.getByText(/does not create employee records, employee roles, or medical records/i)).toBeVisible();
});

test("patient registration page has no horizontal overflow on narrow mobile widths", async ({ page }) => {
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 850 }); await page.goto("/register");
    const dimensions = await page.evaluate(() => ({ documentWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  }
});

test("forgot password page accepts an email address", async ({ page }) => {
  await page.goto("/forgot-password");
  await expect(page.getByRole("heading", { level: 2, name: "Reset your password" })).toBeVisible();
  await expect(page.getByLabel("Email address")).toHaveAttribute("type", "email");
  await expect(page.getByRole("button", { name: /send password reset link/i })).toBeVisible();
});

test("reset password page rejects a missing token without showing password controls", async ({ page }) => {
  await page.goto("/reset-password");
  await expect(page.getByText(/invalid or has expired/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /request another reset link/i })).toHaveAttribute("href", "/forgot-password");
  await expect(page.getByLabel("New password")).toHaveCount(0);
});

test("account security page requires a verified authenticated session", async ({ page }) => {
  await page.goto("/auth/account-security");
  await expect(page).toHaveURL(/\/login$/);
});
