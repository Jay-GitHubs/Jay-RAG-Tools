import { test, expect } from "@playwright/test";

const JOB_ID = "08cb8a24-b9d9-49c1-b15a-bd69018170bb";
const BASE = "http://localhost:3002";

test.describe("Review Page", () => {
  test("results page has Review button linking to /review/[id]", async ({ page }) => {
    await page.goto(`${BASE}/results/${JOB_ID}`);
    await page.waitForLoadState("networkidle");

    const reviewLink = page.locator('a[href*="/review/"]');
    await expect(reviewLink).toBeVisible();
    await expect(reviewLink).toContainText("Review");
  });

  test("review page loads with split layout", async ({ page }) => {
    await page.goto(`${BASE}/review/${JOB_ID}`);
    await page.waitForLoadState("networkidle");

    // Wait for the page to finish loading
    await page.waitForTimeout(2000);

    // Should show job ID in toolbar (use specific selector to avoid strict mode violation)
    await expect(page.locator("span.font-mono", { hasText: JOB_ID.slice(0, 8) })).toBeVisible();

    // Should have Sections/Editor mode toggle
    await expect(page.getByRole("button", { name: "Sections" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Editor" })).toBeVisible();

    // Should have back link to results
    const backLink = page.locator('a[href*="/results/"]');
    await expect(backLink).toBeVisible();

    // Should have page navigator
    await expect(page.locator("text=/\\d+ \\/ \\d+/")).toBeVisible();

    // Take screenshot of the full review page
    await page.screenshot({ path: "e2e/screenshots/review-page-sections.png", fullPage: false });
  });

  test("section panel shows markdown sections with page headers", async ({ page }) => {
    await page.goto(`${BASE}/review/${JOB_ID}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Should have section cards with "Page" labels
    const sectionCards = page.locator('[data-section]');
    const count = await sectionCards.count();
    expect(count).toBeGreaterThan(0);

    // First page section should exist
    const firstPageSection = page.locator('[data-section="1"]');
    if (await firstPageSection.count() > 0) {
      await expect(firstPageSection).toBeVisible();
    }
  });

  test("can toggle to Editor mode and see textarea", async ({ page }) => {
    await page.goto(`${BASE}/review/${JOB_ID}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Click Editor toggle
    await page.getByRole("button", { name: "Editor" }).click();
    await page.waitForTimeout(500);

    // Should show a textarea with markdown content
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();
    const content = await textarea.inputValue();
    expect(content.length).toBeGreaterThan(0);

    // Should show "Raw Markdown" label
    await expect(page.locator("text=Raw Markdown")).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/review-page-editor.png", fullPage: false });
  });

  test("can toggle back to Sections mode", async ({ page }) => {
    await page.goto(`${BASE}/review/${JOB_ID}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Switch to Editor
    await page.getByRole("button", { name: "Editor" }).click();
    await page.waitForTimeout(500);

    // Switch back to Sections
    await page.getByRole("button", { name: "Sections" }).click();
    await page.waitForTimeout(500);

    // Should show section cards again
    const sectionCards = page.locator('[data-section]');
    const count = await sectionCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("toolbar actions: Copy, .md download, ZIP download", async ({ page }) => {
    await page.goto(`${BASE}/review/${JOB_ID}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Copy button should exist
    await expect(page.getByRole("button", { name: "Copy" })).toBeVisible();

    // .md download button
    await expect(page.getByRole("button", { name: ".md" })).toBeVisible();

    // ZIP download button
    await expect(page.getByRole("button", { name: "ZIP" })).toBeVisible();
  });

  test("page navigator works", async ({ page }) => {
    await page.goto(`${BASE}/review/${JOB_ID}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Get current page indicator text
    const pageIndicator = page.locator("text=/\\d+ \\/ \\d+/");
    const initialText = await pageIndicator.textContent();

    // If there are multiple pages, test navigation
    const match = initialText?.match(/(\d+)\s*\/\s*(\d+)/);
    if (match && parseInt(match[2]) > 1) {
      // Click next page button (the right chevron)
      const nextBtn = page.locator('button:has(path[d*="m8.25 4.5"])');
      if (await nextBtn.isEnabled()) {
        await nextBtn.click();
        await page.waitForTimeout(500);

        const newText = await pageIndicator.textContent();
        // Page number should have changed
        expect(newText).not.toBe(initialText);
      }
    }
  });

  test("PDF viewer loads and renders", async ({ page }) => {
    await page.goto(`${BASE}/review/${JOB_ID}`);
    await page.waitForLoadState("networkidle");

    // Wait longer for PDF to render
    await page.waitForTimeout(4000);

    // react-pdf renders canvas elements for PDF pages
    const canvases = page.locator("canvas");
    const canvasCount = await canvases.count();

    // Should have at least one canvas (one PDF page rendered)
    expect(canvasCount).toBeGreaterThan(0);

    await page.screenshot({ path: "e2e/screenshots/review-page-pdf-loaded.png", fullPage: false });
  });
});
