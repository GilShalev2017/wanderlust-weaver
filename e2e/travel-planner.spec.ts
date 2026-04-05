import { test, expect } from "../playwright-fixture";

test.describe("Travel Planner E2E", () => {
  test("full trip planning flow from input to results", async ({ page }) => {
    await page.goto("/");

    // Verify the landing page loads
    await expect(page.locator("h1")).toContainText("Travel Planner");
    const textarea = page.locator('textarea[placeholder="Describe your dream trip..."]');
    await expect(textarea).toBeVisible();

    // Type a trip request
    await textarea.fill("2 days in Rome, interested in history and pasta");

    // Submit the form
    const submitButton = page.getByRole("button", { name: /Plan My Trip/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Verify agents start working
    await expect(page.getByText("Agents are planning your trip…")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Research Agent")).toBeVisible();

    // Wait for streaming content to appear
    await expect(page.getByText("Your Itinerary")).toBeVisible({ timeout: 120000 });

    // Wait for completion
    await expect(page.getByRole("button", { name: /Plan Another Trip/i })).toBeVisible({ timeout: 180000 });

    // Verify day structure
    await expect(page.locator("text=/Day\\s*\\d/i").first()).toBeVisible();

    // Verify Export PDF button
    await expect(page.getByRole("button", { name: /Export PDF/i })).toBeVisible();
  });

  test("sample trip button fills textarea", async ({ page }) => {
    await page.goto("/");

    // Click first sample trip
    const sampleButton = page.locator("button").filter({ hasText: /Japan/ });
    await sampleButton.click();

    // Verify textarea is filled
    const textarea = page.locator('textarea[placeholder="Describe your dream trip..."]');
    await expect(textarea).toHaveValue(/Japan/);

    // Submit should now be enabled
    const submitButton = page.getByRole("button", { name: /Plan My Trip/i });
    await expect(submitButton).toBeEnabled();
  });

  test("reset flow works after completion", async ({ page }) => {
    await page.goto("/");

    // Submit a quick trip
    await page.locator('textarea[placeholder="Describe your dream trip..."]').fill("1 day in London");
    await page.getByRole("button", { name: /Plan My Trip/i }).click();

    // Wait for completion
    await expect(page.getByRole("button", { name: /Plan Another Trip/i })).toBeVisible({ timeout: 180000 });

    // Click reset
    await page.getByRole("button", { name: /Plan Another Trip/i }).click();

    // Should be back to input state
    await expect(page.locator('textarea[placeholder="Describe your dream trip..."]')).toBeVisible();
    await expect(page.getByText("Plan My Trip")).toBeVisible();
  });
});
