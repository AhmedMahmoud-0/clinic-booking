import { expect, test } from "@playwright/test";

test("public homepage renders the MERUNO introduction and demo notice", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "A calmer way to run an outpatient clinic.",
    }),
  ).toBeVisible();
  await expect(page.getByText(/This is a portfolio demo/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
    "href",
    "#main-content",
  );

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("public homepage has no horizontal overflow on narrow mobile widths", async ({
  page,
}) => {
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");

    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));

    expect(
      dimensions.documentWidth,
      `Unexpected horizontal overflow at ${width}px viewport width`,
    ).toBeLessThanOrEqual(dimensions.viewportWidth);
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
