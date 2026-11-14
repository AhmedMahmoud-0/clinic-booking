import { expect, test } from "@playwright/test";

test("public homepage renders the MERUNO introduction and demo notice", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "A clearer path to outpatient care." })).toBeVisible();
  await expect(page.getByText(/portfolio demonstration using synthetic data/i)).toBeVisible();
  await expect(page.getByTestId("home-book-appointment")).toHaveAttribute("href", "/book-appointment");
  await expect(page.getByTestId("home-find-doctor")).toHaveAttribute("href", "/doctors");
  await expect(page.getByTestId("home-explore-specialties")).toHaveAttribute("href", "/specialties");

  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toHaveCount(1);
  await expect(skipLink).toHaveAttribute("href", "#main-content");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("link", { name: "Sign in" }).first()).toHaveAttribute("href", "/login");
});

test("homepage specialty cards navigate to their detail pages", async ({ page }) => {
  await page.goto("/");
  const card = page.getByTestId("home-specialty-card").first();
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("href", /^\/specialties\/[^/]+$/);
  await card.click();
  await expect(page).toHaveURL(/\/specialties\/[^/?]+$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("public navigation links work when clicked", async ({ page }) => {
  await page.goto("/");
  const aboutLink = page.getByRole("link", { name: "About", exact: true }).first();
  await expect(aboutLink).toHaveAttribute("href", "/about");
  await aboutLink.click();
  await expect(page).toHaveURL(/\/about$/, { timeout: 30_000 });
  await expect(page.getByRole("main").getByRole("heading", {
    level: 1,
    name: /A focused clinic model, brought into one digital experience/i,
  })).toBeVisible();

  const servicesLink = page.getByRole("link", { name: "Services", exact: true }).first();
  await expect(servicesLink).toHaveAttribute("href", "/services");
  await servicesLink.click();
  await expect(page).toHaveURL(/\/services$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", {
    level: 1,
    name: /The services included in the MERUNO clinic model/i,
  })).toBeVisible();
  await expect(page.getByText("Digital X-ray", { exact: true })).toBeVisible();
  await expect(page.getByText("Ultrasound", { exact: true })).toBeVisible();
});

test("public pages have no horizontal overflow on narrow mobile widths", async ({ page }) => {
  for (const route of ["/", "/about", "/services"]) {
    for (const width of [320, 360, 390]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(route);
      await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeHidden();
      await expect(page.locator(".meruno-public-desktop-actions")).toBeHidden();
      await expect(page.locator(".meruno-public-mobile-navigation > summary")).toBeVisible();
      const dimensions = await page.evaluate(() => {
        const viewportWidth = document.documentElement.clientWidth;
        const offenders = Array.from(document.querySelectorAll<HTMLElement>("body *"))
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              tag: element.tagName.toLowerCase(),
              id: element.id,
              className: typeof element.className === "string" ? element.className.slice(0, 180) : "",
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
            };
          })
          .filter((item) => item.width > 0 && (item.left < -1 || item.right > viewportWidth + 1))
          .sort((a, b) => b.right - a.right)
          .slice(0, 8);
        return {
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth,
          offenders,
        };
      });

      expect(
        dimensions.documentWidth,
        `Unexpected horizontal overflow at ${width}px on ${route}. Elements outside viewport: ${JSON.stringify(dimensions.offenders)}`,
      ).toBeLessThanOrEqual(dimensions.viewportWidth);

      if (route === "/") {
        await expect(page.getByRole("contentinfo").getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
      }
    }
  }
});

test("public footer shows the MERUNO brand and complete grouped navigation", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "MERUNO Medical Clinics home" })).toBeVisible();
  for (const label of ["Specialties", "Doctors", "Book appointment", "Sign in", "FAQ", "Contact", "Privacy notice", "Terms of use"]) {
    await expect(footer.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  await expect(footer.getByText(/synthetic data only/i)).toBeVisible();
});

test("health endpoint returns a safe non-cacheable response contract", async ({ request }) => {
  const response = await request.get("/api/health");
  expect([200, 503]).toContain(response.status());
  expect(response.headers()["cache-control"]).toContain("no-store");
  const payload: unknown = await response.json();
  if (response.status() === 200) {
    expect(payload).toEqual({ status: "ok", database: "ok" });
  } else {
    expect(payload).toEqual({ status: "degraded", database: "unavailable" });
  }
  expect(JSON.stringify(payload)).not.toMatch(/postgres|password|database_url|stack|exception/i);
});
