import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("loads dashboard with nav, stats, and sections", async ({ page }) => {
    await page.goto("/");

    // Nav bar
    await expect(page.locator("nav")).toBeVisible();
    await expect(page.locator("nav a", { hasText: "JAY-RAG-TOOLS" })).toBeVisible();
    await expect(page.locator("nav a", { hasText: "Dashboard" })).toBeVisible();
    await expect(page.locator("nav a", { hasText: "Upload" })).toBeVisible();
    await expect(page.locator("nav a", { hasText: "Jobs" })).toBeVisible();

    // Stats cards
    await expect(page.getByText("Total Jobs")).toBeVisible();
    await expect(page.getByText("Completed", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Processing", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Failed", { exact: true }).first()).toBeVisible();

    // Quick Upload section
    await expect(page.getByText("Quick Upload")).toBeVisible();
    await expect(page.getByRole("link", { name: "Upload PDF" })).toBeVisible();

    // Recent Jobs section
    await expect(page.getByText("Recent Jobs")).toBeVisible();
  });

  test("API health check works through proxy", async ({ page }) => {
    const response = await page.request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.version).toBe("2.0.0");
  });
});

test.describe("Upload Page", () => {
  test("renders upload form and pipeline config", async ({ page }) => {
    await page.goto("/upload");

    // Upload heading
    await expect(page.getByText("Upload PDF")).toBeVisible();

    // File drop zone or upload area
    await expect(page.getByText(/drag|drop|choose|select/i)).toBeVisible();

    // Pipeline config fields
    await expect(page.getByText(/provider/i)).toBeVisible();
    await expect(page.getByText(/language/i)).toBeVisible();
  });
});

test.describe("Jobs Page", () => {
  test("loads jobs list", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();
  });

  test("API returns jobs list", async ({ page }) => {
    const response = await page.request.get("/api/jobs");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.jobs).toBeDefined();
    expect(Array.isArray(body.jobs)).toBe(true);
  });
});

test.describe("Config API", () => {
  test("returns providers, languages, and storage backends", async ({ page }) => {
    const response = await page.request.get("/api/config");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    expect(body.providers.length).toBeGreaterThan(0);
    expect(body.providers.map((p: { name: string }) => p.name)).toContain("ollama");
    expect(body.providers.map((p: { name: string }) => p.name)).toContain("openai");

    expect(body.languages.length).toBe(2);
    expect(body.storage_backends).toContain("local");
  });
});

test.describe("Upload and Process Flow", () => {
  test("upload PDF via API and track job completion", async ({ page }) => {
    // Upload via API
    const uploadResponse = await page.request.post("/api/upload", {
      multipart: {
        file: {
          name: "test.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from(
            await (await fetch("http://localhost:3000/api/health")).arrayBuffer()
          ).length > 0
            ? require("fs").readFileSync("/Volumes/Jay-SSD/MyCodings/Jay-RAG-Tools/test.pdf")
            : Buffer.from(""),
        },
        config: JSON.stringify({
          provider: "ollama",
          model: "qwen2.5vl",
          language: "th",
        }),
      },
    });

    expect(uploadResponse.ok()).toBeTruthy();
    const { job_id } = await uploadResponse.json();
    expect(job_id).toBeDefined();

    // Poll for job completion (max 120s)
    let status = "pending";
    let attempts = 0;
    while (status !== "completed" && status !== "failed" && attempts < 60) {
      await page.waitForTimeout(2000);
      const jobResponse = await page.request.get(`/api/jobs/${job_id}`);
      const job = await jobResponse.json();
      status = job.status;
      attempts++;
    }

    expect(status).toBe("completed");

    // Navigate to jobs page and verify job shows up
    await page.goto("/jobs");
    await page.waitForTimeout(1000);

    // Check results endpoint
    const resultsResponse = await page.request.get(`/api/results/${job_id}`);
    expect(resultsResponse.ok()).toBeTruthy();
    const results = await resultsResponse.json();
    expect(results.markdown).toBeDefined();
    expect(results.metadata.length).toBe(4); // 4 images in test.pdf
  });
});
