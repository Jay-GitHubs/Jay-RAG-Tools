import { test } from "@playwright/test";

test.describe("UI Screenshots for Analysis", () => {
  test("capture dashboard", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "e2e/screenshots/dashboard.png", fullPage: true });
  });

  test("capture upload page", async ({ page }) => {
    await page.goto("/upload");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "e2e/screenshots/upload.png", fullPage: true });
  });

  test("capture jobs page", async ({ page }) => {
    await page.goto("/jobs");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "e2e/screenshots/jobs.png", fullPage: true });
  });
});
