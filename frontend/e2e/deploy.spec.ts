import { test, expect, type Page } from "@playwright/test";

// Direct API URL (bypass Next.js proxy to avoid Docker IPv6 conflict on port 3000)
const API = "http://127.0.0.1:3000";

/** Find a completed job ID via the API. */
async function getCompletedJobId(page: Page, timeoutMs = 30_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await page.request.get(`${API}/api/jobs`);
    if (res.ok()) {
      const { jobs } = await res.json();
      const completed = jobs.find(
        (j: { status: string }) => j.status === "completed"
      );
      if (completed) return completed.id;
    }
    await page.waitForTimeout(2000);
  }
  throw new Error("No completed job found");
}

test.describe("Deploy to RAG Platform", () => {
  let jobId: string;

  test.beforeEach(async ({ page }) => {
    jobId = await getCompletedJobId(page);
  });

  test("Deploy button opens modal and closes on Cancel", async ({ page }) => {
    await page.goto(`/results/${jobId}`);
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible({
      timeout: 10_000,
    });

    // Click the Deploy button
    await page.getByRole("button", { name: "Deploy" }).click();

    // Modal should be visible
    await expect(
      page.getByRole("heading", { name: "Deploy to RAG Platform" })
    ).toBeVisible();

    // Cancel closes the modal
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("heading", { name: "Deploy to RAG Platform" })
    ).not.toBeVisible();
  });

  test("Deploy Now is disabled without required fields", async ({ page }) => {
    await page.goto(`/results/${jobId}`);
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: "Deploy" }).click();
    await expect(
      page.getByRole("heading", { name: "Deploy to RAG Platform" })
    ).toBeVisible();

    // Deploy Now should be disabled (no base URL and no targets selected)
    const deployBtn = page.getByRole("button", { name: "Deploy Now" });
    await expect(deployBtn).toBeDisabled();
  });

  test("Local folder deploy succeeds end-to-end", async ({ page }) => {
    await page.goto(`/results/${jobId}`);
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: "Deploy" }).click();
    await expect(
      page.getByRole("heading", { name: "Deploy to RAG Platform" })
    ).toBeVisible();

    // Scope to the modal overlay
    const modal = page.locator(".fixed");

    // Fill in Image Base URL (inside the modal, not the export section)
    await modal
      .getByPlaceholder("e.g. http://192.168.0.10:8444/rag-images")
      .fill("http://localhost:8080/test-imgs");

    // Select Image target: Local Folder
    const imageSelect = modal
      .locator("fieldset", { hasText: "Image Deployment" })
      .getByRole("combobox");
    await imageSelect.selectOption("local_folder");
    await page
      .getByPlaceholder("/var/www/images/manual")
      .fill("/tmp/playwright-deploy-images");

    // Select Markdown target: Local Folder
    const mdSelect = modal
      .locator("fieldset", { hasText: "Markdown Deployment" })
      .getByRole("combobox");
    await mdSelect.selectOption("local_folder");
    await page
      .getByPlaceholder("/var/www/markdown")
      .fill("/tmp/playwright-deploy-md");

    // Deploy Now should now be enabled
    const deployBtn = page.getByRole("button", { name: "Deploy Now" });
    await expect(deployBtn).toBeEnabled();
    await deployBtn.click();

    // Should show deploying spinner briefly, then success result
    await expect(
      page.getByText("Deployment completed successfully")
    ).toBeVisible({ timeout: 15_000 });

    // Check step results are shown
    await expect(page.getByText(/images copied to/)).toBeVisible();
    await expect(page.getByText(/Markdown saved to/)).toBeVisible();

    // Close the result
    await page.getByRole("button", { name: "Close" }).click();
    await expect(
      page.getByRole("heading", { name: "Deploy to RAG Platform" })
    ).not.toBeVisible();
  });

  test("Flowise fields appear when Flowise target is selected", async ({
    page,
  }) => {
    await page.goto(`/results/${jobId}`);
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: "Deploy" }).click();

    // Select Markdown target: Flowise
    const mdSelect = page
      .locator("fieldset", { hasText: "Markdown Deployment" })
      .getByRole("combobox");
    await mdSelect.selectOption("flowise");

    // Flowise-specific fields should appear
    await expect(page.getByPlaceholder("http://localhost:3001")).toBeVisible();
    await expect(page.getByPlaceholder("Flowise API key")).toBeVisible();
    await expect(page.getByPlaceholder("abc-123-def-456")).toBeVisible();
  });

  test("S3 fields appear when S3 image target is selected", async ({
    page,
  }) => {
    await page.goto(`/results/${jobId}`);
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: "Deploy" }).click();

    // Select Image target: S3
    const imageSelect = page
      .locator("fieldset", { hasText: "Image Deployment" })
      .getByRole("combobox");
    await imageSelect.selectOption("s3");

    // S3-specific fields should appear
    await expect(page.getByPlaceholder("my-rag-images")).toBeVisible();
    await expect(page.getByPlaceholder("images/manual")).toBeVisible();
    await expect(
      page.getByPlaceholder("ap-southeast-1 (uses default if empty)")
    ).toBeVisible();
  });

  test("Image base URL from results page carries over to modal", async ({
    page,
  }) => {
    await page.goto(`/results/${jobId}`);
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible({
      timeout: 10_000,
    });

    // Type an image base URL in the export section first
    const exportInput = page
      .locator("input")
      .filter({ hasText: "" })
      .and(
        page.getByPlaceholder("e.g. http://192.168.0.10:8444/rag-images").first()
      );
    await exportInput.fill("http://my-server:9000/images");

    // Open deploy modal — should carry over the URL
    await page.getByRole("button", { name: "Deploy" }).click();

    // The modal's base URL input should have the same value
    const modalInput = page
      .locator(".fixed")
      .getByPlaceholder("e.g. http://192.168.0.10:8444/rag-images");
    await expect(modalInput).toHaveValue("http://my-server:9000/images");
  });
});
