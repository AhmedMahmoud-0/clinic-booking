import { expect, test } from "@playwright/test";

test("login page renders the complete MERUNO sign-in experience", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto("/login");

  await expect(page.getByRole("heading", { level: 2, name: "Welcome back" })).toBeVisible();
  await expect(page.getByLabel("Email address")).toHaveAttribute("type", "email");
  await expect(page.getByRole("textbox", { name: "Password" })).toHaveAttribute("type", "password");
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /create an account/i })).toHaveAttribute("href", "/register");
  await expect(page.getByRole("link", { name: /forgot password/i })).toHaveAttribute("href", "/forgot-password");

  const brandPanel = page.getByTestId("auth-brand-panel");
  const brandStyle = await brandPanel.evaluate((element) => {
    const style = getComputedStyle(element);
    return { display: style.display, backgroundImage: style.backgroundImage, color: style.color };
  });
  expect(brandStyle.display).toBe("flex");
  expect(brandStyle.backgroundImage).not.toBe("none");
  expect(brandStyle.color).toBe("rgb(255, 255, 255)");
  await expect(page.getByTestId("auth-form-panel")).toBeVisible();
});

test("registration page renders the matching patient account experience", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto("/register");
  await expect(page.getByRole("heading", { level: 2, name: "Create your account" })).toBeVisible();
  await expect(page.getByTestId("auth-brand-panel")).toBeVisible();
  await expect(page.getByTestId("sign-up-form")).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(page.getByLabel("Email address")).toHaveAttribute("type", "email");
  await expect(page.getByRole("button", { name: /create patient account/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/login");
});

test("login and registration pages have no horizontal overflow at narrow mobile widths", async ({ page }) => {
  for (const route of ["/login", "/register"]) {
    for (const width of [320, 360, 390]) {
      await page.setViewportSize({ width, height: 850 });
      await page.goto(route);
      const dimensions = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }));
      expect(dimensions.documentWidth, `${route} at ${width}px`).toBeLessThanOrEqual(dimensions.viewportWidth);
      await expect(page.getByTestId("auth-brand-panel")).toBeVisible();
    }
  }
});

test("account status requires an authenticated session", async ({ page }) => {
  await page.goto("/auth/account-status");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { level: 2, name: "Welcome back" })).toBeVisible();
});

test("public header labels the authentication route as Sign in on desktop and mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/login");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.locator("header details summary").click();
  const mobileNavigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(mobileNavigation.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/login");
});
