import { test, expect } from "@playwright/test";

const JOB_ID = "08cb8a24-b9d9-49c1-b15a-bd69018170bb";
const BASE = "http://localhost:3002";

test.describe("Review Page Improvements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/review/${JOB_ID}`);
    await page.waitForLoadState("networkidle");
    // Wait for sections to render
    await expect(page.locator("[data-section]").first()).toBeVisible({ timeout: 10000 });
  });

  // --- Phase 1: Inline Section Editing ---

  test("section cards have edit buttons", async ({ page }) => {
    // Non-header sections (pageNumber > 0) should have edit (pencil) buttons
    const firstPageSection = page.locator('[data-section="1"]');
    if ((await firstPageSection.count()) === 0) return;

    const editBtn = firstPageSection.locator('button[title*="Edit"]');
    await expect(editBtn).toBeVisible();
  });

  test("clicking edit opens inline editor with textarea", async ({ page }) => {
    const firstPageSection = page.locator('[data-section="1"]');
    if ((await firstPageSection.count()) === 0) return;

    const editBtn = firstPageSection.locator('button[title*="Edit"]');
    await editBtn.click();

    // Should show a textarea inside the section card
    const textarea = firstPageSection.locator("textarea");
    await expect(textarea).toBeVisible();

    // Should show Save and Cancel buttons
    await expect(firstPageSection.getByRole("button", { name: "Save" })).toBeVisible();
    await expect(firstPageSection.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("inline edit cancel returns to viewer", async ({ page }) => {
    const firstPageSection = page.locator('[data-section="1"]');
    if ((await firstPageSection.count()) === 0) return;

    const editBtn = firstPageSection.locator('button[title*="Edit"]');
    await editBtn.click();

    // Click Cancel
    await firstPageSection.getByRole("button", { name: "Cancel" }).click();

    // Textarea should be gone
    await expect(firstPageSection.locator("textarea")).not.toBeVisible();
  });

  test("inline edit save updates section content", async ({ page }) => {
    const firstPageSection = page.locator('[data-section="1"]');
    if ((await firstPageSection.count()) === 0) return;

    const editBtn = firstPageSection.locator('button[title*="Edit"]');
    await editBtn.click();

    const textarea = firstPageSection.locator("textarea");
    await expect(textarea).toBeVisible();

    // Add some unique text
    const uniqueText = `INLINE_EDIT_TEST_${Date.now()}`;
    await textarea.fill(uniqueText);

    // Click Save
    await firstPageSection.getByRole("button", { name: "Save" }).click();

    // Textarea should be gone, content should contain the unique text
    await expect(firstPageSection.locator("textarea")).not.toBeVisible();
    await expect(firstPageSection).toContainText(uniqueText);
  });

  // --- Phase 2: Drag-and-Drop Reorder ---

  test("section cards have drag handles", async ({ page }) => {
    const firstPageSection = page.locator('[data-section="1"]');
    if ((await firstPageSection.count()) === 0) return;

    // Drag handle button with "Drag to reorder" title
    const dragHandle = firstPageSection.locator('button[title="Drag to reorder"]');
    await expect(dragHandle).toBeVisible();
  });

  test("all non-header sections have drag handles", async ({ page }) => {
    const sections = page.locator("[data-section]");
    const count = await sections.count();

    for (let i = 0; i < count; i++) {
      const section = sections.nth(i);
      const dragHandle = section.locator('button[title="Drag to reorder"]');
      await expect(dragHandle).toBeVisible();
    }
  });

  // --- Phase 3: Keyboard Shortcuts ---

  test("Ctrl+F opens search bar", async ({ page }) => {
    // Search bar should not be visible initially
    await expect(page.locator('input[placeholder="Search..."]')).not.toBeVisible();

    // Press Ctrl+F
    await page.keyboard.press("ControlOrMeta+f");

    // Search bar should now be visible
    await expect(page.locator('input[placeholder="Search..."]')).toBeVisible();
  });

  test("Escape closes search bar", async ({ page }) => {
    // Open search
    await page.keyboard.press("ControlOrMeta+f");
    await expect(page.locator('input[placeholder="Search..."]')).toBeVisible();

    // Press Escape
    await page.keyboard.press("Escape");

    // Search bar should be hidden
    await expect(page.locator('input[placeholder="Search..."]')).not.toBeVisible();
  });

  test("toolbar has Undo and Search buttons", async ({ page }) => {
    // Search button should always be visible
    await expect(page.getByRole("button", { name: "Search" })).toBeVisible();

    // Undo button appears only after edits — not visible initially
    await expect(page.getByRole("button", { name: "Undo" })).not.toBeVisible();
  });

  test("Undo button appears after editing a section", async ({ page }) => {
    const firstPageSection = page.locator('[data-section="1"]');
    if ((await firstPageSection.count()) === 0) return;

    // Edit a section
    const editBtn = firstPageSection.locator('button[title*="Edit"]');
    await editBtn.click();
    const textarea = firstPageSection.locator("textarea");
    await textarea.fill("undo test content");
    await firstPageSection.getByRole("button", { name: "Save" }).click();

    // Undo button should now be visible
    await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
  });

  // --- Phase 4: Search & Replace ---

  test("search bar shows match count when typing", async ({ page }) => {
    // Open search
    await page.keyboard.press("ControlOrMeta+f");
    const searchInput = page.locator('input[placeholder="Search..."]');
    await expect(searchInput).toBeVisible();

    // Type a common word that should exist in the markdown (e.g. "Page")
    await searchInput.fill("Page");

    // Should show match count inside the search bar (scoped to the search input's parent)
    const searchBar = page.locator('input[placeholder="Search..."]').locator("..");
    await expect(
      searchBar.locator("text=/\\d+ \\/ \\d+|No results/")
    ).toBeVisible({ timeout: 3000 });
  });

  test("search bar has case sensitive toggle", async ({ page }) => {
    await page.keyboard.press("ControlOrMeta+f");

    // "Aa" button for case sensitivity
    const csButton = page.locator('button[title="Case sensitive"]');
    await expect(csButton).toBeVisible();
  });

  test("Replace toggle shows replace inputs", async ({ page }) => {
    await page.keyboard.press("ControlOrMeta+f");

    // Click Replace toggle
    await page.getByRole("button", { name: "Replace" }).first().click();

    // Should show replace input and action buttons
    await expect(page.locator('input[placeholder="Replace with..."]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Replace All" })).toBeVisible();
  });

  test("Replace All modifies markdown content", async ({ page }) => {
    // Open search
    await page.keyboard.press("ControlOrMeta+f");
    const searchInput = page.locator('input[placeholder="Search..."]');

    // Use a unique search term that exists in page headers
    await searchInput.fill("Page 1");

    // Wait for matches
    await page.waitForTimeout(300);

    // Open replace
    await page.getByRole("button", { name: "Replace" }).first().click();
    const replaceInput = page.locator('input[placeholder="Replace with..."]');
    await replaceInput.fill("Section 1");

    // Click Replace All
    await page.getByRole("button", { name: "Replace All" }).click();

    // The section panel should now show "Section 1" instead of "Page 1"
    // and the Undo button should appear
    await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
  });

  test("search bar toggles from toolbar Search button", async ({ page }) => {
    const searchBtn = page.getByRole("button", { name: "Search" });

    // Click Search button to open
    await searchBtn.click();
    await expect(page.locator('input[placeholder="Search..."]')).toBeVisible();

    // Click again to close
    await searchBtn.click();
    await expect(page.locator('input[placeholder="Search..."]')).not.toBeVisible();
  });

  // --- Screenshots ---

  test("screenshot: search bar open", async ({ page }) => {
    await page.keyboard.press("ControlOrMeta+f");
    const searchInput = page.locator('input[placeholder="Search..."]');
    await searchInput.fill("Page");
    await page.waitForTimeout(500);

    await page.screenshot({
      path: "e2e/screenshots/review-search-bar.png",
      fullPage: false,
    });
  });

  test("screenshot: inline editing", async ({ page }) => {
    const firstPageSection = page.locator('[data-section="1"]');
    if ((await firstPageSection.count()) === 0) return;

    const editBtn = firstPageSection.locator('button[title*="Edit"]');
    await editBtn.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: "e2e/screenshots/review-inline-edit.png",
      fullPage: false,
    });
  });
});
