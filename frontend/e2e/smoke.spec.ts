import { test, expect } from '@playwright/test';

/**
 * Smoke test: drives the legacy-styled UI end-to-end.
 *
 *   docker compose -f docker-compose.dev.yml up --build -d
 *   PLAYWRIGHT_BASE_URL=http://life-towers:8000 npx playwright test
 *   docker compose -f docker-compose.dev.yml down -v
 */
test.describe('Life Towers smoke test', () => {
  test('create page → tower → block, mark done, reload, persists', async ({ page }) => {
    await page.goto('/');

    // Wait for the empty-state hint that means init() completed.
    await expect(page.getByText('Add a new page to get started!')).toBeVisible({ timeout: 15000 });

    // Create a page via the select-add dropdown.
    await page.locator('lt-select-add .top').first().click();
    await page.locator('lt-select-add input[placeholder="Add a value…"]').fill('Hobbies');
    await page.locator('lt-select-add input[placeholder="Add a value…"]').press('Enter');

    // The page name now appears in the dropdown top.
    await expect(page.locator('lt-select-add .top').first()).toContainText('Hobbies');

    // Create a tower.
    await page.locator('img[alt="Add tower"]').click();
    await page.locator('input[placeholder="Tower name…"]').fill('Side projects');
    await page.locator('lt-tower-settings button[type="submit"]').click();

    // Tower's name input is rendered with the tower name as its value.
    await expect(page.locator('lt-tower input').first()).toHaveValue('Side projects');

    // Create a block.
    await page.locator('img[alt="Add block"]').first().click();
    // The tag input is inside an lt-select-add — open it and add a tag.
    await page.locator('lt-block-edit lt-select-add .top').click();
    await page
      .locator('lt-block-edit lt-select-add input[placeholder="Add a value…"]')
      .fill('learn');
    await page
      .locator('lt-block-edit lt-select-add input[placeholder="Add a value…"]')
      .press('Enter');
    await page.locator('textarea[placeholder="Write a description here…"]').fill(
      'Modernise the towers app',
    );
    await page.getByRole('button', { name: 'Create and exit' }).click();

    // New block is pending → appears in the tasks accordion.
    // (Tasks header shows N tasks.)
    await expect(page.locator('lt-tasks')).toContainText('1');

    // Open the tasks accordion + click the task to edit it, then flip done.
    await page.locator('lt-tasks .container').click();
    await page.locator('lt-tasks .task-container').click();

    // Toggle done in the block-edit modal — the right label is "Done".
    const putLanded = page.waitForResponse(
      (r) => r.url().endsWith('/api/v1/data') && r.request().method() === 'PUT' && r.ok(),
    );
    // Toggle uses verbose labels — "Goal accomplished" flips it to done.
    await page
      .locator('lt-block-edit lt-toggle span')
      .filter({ hasText: 'Goal accomplished' })
      .click();
    await page.getByRole('button', { name: 'Create and exit' }).click();
    await putLanded;

    // Done block now appears as a colored square in the tower's falling stack.
    await expect(page.locator('lt-tower lt-block').first()).toBeVisible();

    // Reload — everything must come back from the server.
    await page.reload();
    await expect(page.locator('lt-select-add .top').first()).toContainText('Hobbies', {
      timeout: 15000,
    });
    await expect(page.getByDisplayValue('Side projects')).toBeVisible();
    await expect(page.locator('lt-tower lt-block').first()).toBeVisible();
  });
});
