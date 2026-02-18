import { test, expect } from "@playwright/test";

test.describe("Jobs List — SQLite Persistence", () => {
  test("displays persisted completed job with correct details", async ({
    page,
  }) => {
    await page.goto("/jobs");

    // Heading
    await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();

    // Table should be visible (not "No jobs yet")
    await expect(page.locator("table")).toBeVisible();

    // Table headers
    await expect(page.getByText("File")).toBeVisible();
    await expect(page.getByText("Status")).toBeVisible();
    await expect(page.getByText("Provider")).toBeVisible();
    await expect(page.getByText("Images")).toBeVisible();
    await expect(page.getByText("Actions")).toBeVisible();

    // Find a completed job row (filter by both filename and "completed" badge)
    const completedRow = page
      .locator("tr", { hasText: "test.pdf" })
      .filter({ hasText: "completed" })
      .first();
    await expect(completedRow).toBeVisible();

    // Filename link
    await expect(
      completedRow.locator("a", { hasText: "test.pdf" })
    ).toBeVisible();

    // Status badge shows "completed"
    await expect(completedRow.getByText("completed")).toBeVisible();

    // Provider shows ollama
    await expect(completedRow.getByText("ollama")).toBeVisible();

    // Image count present
    await expect(completedRow.getByText("4")).toBeVisible();

    // "View" button for completed job
    await expect(
      completedRow.getByRole("link", { name: "View" })
    ).toBeVisible();

    // Delete button exists
    await expect(
      completedRow.getByRole("button", { name: "Delete" })
    ).toBeVisible();
  });

  test("completed job links to results page", async ({ page }) => {
    await page.goto("/jobs");

    // Target a completed test.pdf row specifically
    const completedRow = page
      .locator("tr", { hasText: "test.pdf" })
      .filter({ hasText: "completed" })
      .first();
    await expect(completedRow).toBeVisible();

    // The filename link should point to /results/{id}
    const link = completedRow.locator("a", { hasText: "test.pdf" });
    const href = await link.getAttribute("href");
    expect(href).toMatch(/^\/results\/[0-9a-f-]+$/);

    // Click View button and verify navigation
    const viewBtn = completedRow.getByRole("link", { name: "View" });
    await viewBtn.click();

    await expect(page).toHaveURL(/\/results\/[0-9a-f-]+/);
  });

  test("job list reflects API data correctly", async ({ page }) => {
    // Fetch jobs from API
    const response = await page.request.get("/api/jobs");
    expect(response.ok()).toBeTruthy();
    const { jobs } = await response.json();
    expect(jobs.length).toBeGreaterThan(0);

    // Navigate to jobs page
    await page.goto("/jobs");
    await expect(page.locator("table")).toBeVisible();

    // Check that each job on the first page (up to 10) has a visible row
    const firstPage = jobs.slice(0, 10);
    for (const job of firstPage) {
      const idPrefix = job.id.slice(0, 8);
      const row = page.locator("tr", { hasText: idPrefix });
      await expect(row).toBeVisible();
    }

    // If more than 10 jobs, pagination controls should be visible
    if (jobs.length > 10) {
      await expect(page.getByText(/Showing 1–10 of \d+/)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Next" })
      ).toBeVisible();
    }
  });
});
