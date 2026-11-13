import { expect, test } from "@playwright/test";

test("public homepage renders the MERUNO introduction and demo notice", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "A clearer path to outpatient care.",
    }),
  ).toBeVisible();
  await expect(page.getByText(/portfolio demonstration using synthetic data/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
    "href",
    "#main-content",
  );

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("link", { name: "Patient portal" }).first()).toHaveAttribute(
    "href",
    "/login",
  );
});

test("public navigation opens the About and Services pages", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "About", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /A focused clinic model, brought into one digital experience/i,
    }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Services", exact: true }).first().click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /The services included in the MERUNO clinic model/i,
    }),
  ).toBeVisible();
  await expect(page.getByText("Digital X-ray", { exact: true })).toBeVisible();
  await expect(page.getByText("Ultrasound", { exact: true })).toBeVisible();
});

test("public pages have no horizontal overflow on narrow mobile widths", async ({
  page,
}) => {
  for (const route of ["/", "/about", "/services"]) {
    for (const width of [320, 360, 390]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(route);

      const dimensions = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }));

      expect(
        dimensions.documentWidth,
        `Unexpected horizontal overflow at ${width}px viewport width on ${route}`,
      ).toBeLessThanOrEqual(dimensions.viewportWidth);
    }
  }
});

test("health endpoint returns a safe non-cacheable response contract", async ({
  request,
}) => {
  const response = await request.get("/api/health");

  expect([200, 503]).toContain(response.status());
  expect(response.headers()["cache-control"]).toContain("no-store");

  const payload: unknown = await response.json();

  if (response.status() === 200) {
    expect(payload).toEqual({ status: "ok", database: "ok" });
  } else {
    expect(payload).toEqual({
      status: "degraded",
      database: "unavailable",
    });
  }

  expect(JSON.stringify(payload)).not.toMatch(
    /postgres|password|database_url|stack|exception/i,
  );
});
