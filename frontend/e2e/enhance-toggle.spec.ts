import { test, expect } from "@playwright/test";

test.describe("Image Enhancement Toggle", () => {
  test("enhance toggle is visible and off by default", async ({ page }) => {
    await page.goto("/upload");

    // The toggle label should be visible
    const label = page.getByText("Image enhancement");
    await expect(label).toBeVisible();

    // The hint text should be visible
    await expect(
      page.getByText("Sharpen + boost contrast for small Thai text and diacritics")
    ).toBeVisible();

    // The checkbox should be unchecked by default
    const enhanceWrapper = page.getByText("Image enhancement").locator("xpath=ancestor::label");
    const checkbox = enhanceWrapper.locator('input[type="checkbox"]');
    await expect(checkbox).not.toBeChecked();
  });

  test("enhance toggle can be toggled on and off", async ({ page }) => {
    await page.goto("/upload");

    // Find the enhance toggle by its label
    const enhanceLabel = page.getByText("Image enhancement");
    const enhanceToggle = enhanceLabel.locator("..").locator("..").locator('input[type="checkbox"]');

    // Toggle on
    await enhanceLabel.click();
    await expect(enhanceToggle).toBeChecked();

    // Toggle off
    await enhanceLabel.click();
    await expect(enhanceToggle).not.toBeChecked();
  });

  test("enhance toggle is disabled when text_only mode is on", async ({ page }) => {
    await page.goto("/upload");

    // Enable text-only mode
    await page.getByText("Text-only mode").click();

    // The enhance section should have pointer-events-none (disabled)
    const enhanceWrapper = page.getByText("Image enhancement").locator("xpath=ancestor::label");
    await expect(enhanceWrapper).toHaveClass(/pointer-events-none/);
  });

  test("enhance toggle re-enables when text_only is turned off", async ({ page }) => {
    await page.goto("/upload");

    // Enable then disable text-only
    await page.getByText("Text-only mode").click();
    await page.getByText("Text-only mode").click();

    // Enhance wrapper should NOT have pointer-events-none
    const enhanceWrapper = page.getByText("Image enhancement").locator("xpath=ancestor::label");
    await expect(enhanceWrapper).not.toHaveClass(/pointer-events-none/);

    // Should be clickable
    await page.getByText("Image enhancement").click();
    const enhanceToggle = enhanceWrapper.locator('input[type="checkbox"]');
    await expect(enhanceToggle).toBeChecked();
  });
});
