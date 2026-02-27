import { test, expect } from "@playwright/test";

test.describe("DPI Hint Text", () => {
  test("shows Thai auto-upgrade hint in standard mode", async ({ page }) => {
    await page.goto("/upload");

    // Standard mode is default — hint should mention auto 200 for Thai
    await expect(
      page.getByText("Default: 150 DPI (auto 200 for Thai). Higher values improve small text accuracy.")
    ).toBeVisible();
  });

  test("shows high mode hint when high quality selected", async ({ page }) => {
    await page.goto("/upload");

    // Switch to high quality
    await page.getByRole("button", { name: "High" }).click();

    await expect(
      page.getByText("Default: 300 DPI (high mode floor). Values above 300 are used as-is.")
    ).toBeVisible();
  });

  test("switches hint back when returning to standard mode", async ({ page }) => {
    await page.goto("/upload");

    // Switch to high then back to standard
    await page.getByRole("button", { name: "High" }).click();
    await page.getByRole("button", { name: "Standard" }).click();

    await expect(
      page.getByText("Default: 150 DPI (auto 200 for Thai). Higher values improve small text accuracy.")
    ).toBeVisible();
  });
});
