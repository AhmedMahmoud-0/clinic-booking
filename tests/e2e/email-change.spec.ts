import { expect, test } from "@playwright/test";

test("email-change page rejects a missing token", async ({ page }) => {
  await page.goto("/auth/email-change");
  await expect(page.getByText(/invalid or has expired/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /approve email change|verify new email address/i })).toHaveCount(0);
});

test("email-change page rejects an incomplete current-address link", async ({ page }) => {
  await page.goto("/auth/email-change?step=current&userId=demo-user");
  await expect(page.getByText(/invalid or has expired/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /approve email change/i })).toHaveCount(0);
});

test("email-change links require an explicit confirmation action", async ({ page }) => {
  const postRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/auth/email-change/")) {
      postRequests.push(request.url());
    }
  });
  await page.goto(`/auth/email-change?step=current&userId=demo-user&token=${"a".repeat(43)}`);
  await expect(page.getByRole("button", { name: "Approve email change" })).toBeVisible();
  expect(postRequests).toHaveLength(0);
});
