import { test, expect, type Page } from '@playwright/test';

async function expectTaskListOpen(page: Page, description: string): Promise<void> {
  const tasks = page.locator('lt-tasks', { hasText: description }).first();
  const taskBody = tasks.locator('.all-task');
  const taskRow = tasks.locator('.task-container', { hasText: description }).first();

  await expect(tasks.locator('.header')).toHaveCount(0);
  await expect
    .poll(async () =>
      taskBody.evaluate((el) => {
        const height = el.getBoundingClientRect().height;
        return height / Math.max(1, el.scrollHeight);
      }),
    )
    .toBeGreaterThan(0.9);
  await taskRow.locator('.tickbox').click({ trial: true });
}

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

    // Wait for init, then dismiss the welcome modal so the page controls are reachable.
    await expect(page.getByText('Welcome to Life Towers')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Start empty' }).click();
    await page.waitForSelector('section.modal', { state: 'detached' });
    await expect(page.getByText('Add a new page to get started!')).toBeVisible();

    // Create a page via the select-add dropdown.
    await page.locator('lt-select-add .top').first().click();
    await page.locator('lt-select-add input[placeholder="Add a value…"]').fill('Hobbies');
    await page.locator('lt-select-add input[placeholder="Add a value…"]').press('Enter');

    // The page name now appears in the dropdown top.
    await expect(page.locator('lt-select-add .top').first()).toContainText('Hobbies');

    // Create a tower.
    await page.locator('img[alt="Add tower"]').click();
    await page.locator('input[placeholder="New tower"]').fill('Side projects');
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
    await page.getByLabel('Already done').uncheck();
    await page.getByRole('button', { name: 'Create and exit', exact: true }).click();

    // New block is pending → appears in the tasks accordion.
    // (Tasks header shows N tasks.)
    await expect(page.locator('lt-tasks')).toContainText('1');

    // Open the tasks accordion + click the task to edit it, then flip done.
    await page.locator('lt-tasks .header').click();
    await page.locator('lt-tasks .task-description').click();

    // Toggle done in the block-edit modal.
    const putLanded = page.waitForResponse(
      (r) => r.url().endsWith('/api/v1/data') && r.request().method() === 'PUT' && r.ok(),
    );
    await page.locator('lt-block-edit .card.active').getByLabel('Already done').check();
    await putLanded;
    await page.locator('lt-block-edit .card.active .exit').click();
    await page.waitForSelector('section.modal', { state: 'detached' });

    // Done block now appears as a colored square in the tower's falling stack.
    await expect(page.locator('lt-tower lt-block').first()).toBeVisible();

    // Reload — everything must come back from the server.
    await page.reload();
    await expect(page.locator('lt-select-add .top').first()).toContainText('Hobbies', {
      timeout: 15000,
    });
    await expect(page.locator('lt-tower input').first()).toHaveValue('Side projects');
    await expect(page.locator('lt-tower lt-block').first()).toBeVisible();
  });

  test('keep tasks open shows new pending tasks and survives immediate reload', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Welcome to Life Towers')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Start empty' }).click();
    await page.waitForSelector('section.modal', { state: 'detached' });

    await page.locator('lt-select-add .top').first().click();
    await page.locator('lt-select-add input[placeholder="Add a value…"]').fill('Work');
    await page.locator('lt-select-add input[placeholder="Add a value…"]').press('Enter');

    await page.locator('img[alt="Add tower"]').click();
    await page.locator('input[placeholder="New tower"]').fill('Today');
    await page.locator('lt-tower-settings button[type="submit"]').click();
    await page.waitForSelector('section.modal', { state: 'detached' });

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByText('Keep tasks open').click();
    await page.locator('lt-settings .exit').click();
    await page.waitForSelector('section.modal', { state: 'detached' });

    await page.locator('img[alt="Add block"]').first().click();
    const createCard = page.locator('lt-block-edit .create-card');
    await expect(createCard.getByLabel('Already done')).not.toBeChecked();
    await createCard.locator('lt-select-add .top').click();
    await createCard.locator('lt-select-add input[placeholder="Add a value…"]').fill('ops');
    await createCard.locator('lt-select-add input[placeholder="Add a value…"]').press('Enter');
    await createCard
      .locator('textarea[placeholder="Write a description here…"]')
      .fill('Review deploy notes');
    await page.getByRole('button', { name: 'Create and exit', exact: true }).click();
    await page.waitForSelector('section.modal', { state: 'detached' });

    await expectTaskListOpen(page, 'Review deploy notes');

    await page.reload();

    await expect(page.locator('lt-select-add .top').first()).toContainText('Work', {
      timeout: 15000,
    });
    await expectTaskListOpen(page, 'Review deploy notes');

    await page.locator('img[alt="Add block"]').first().click();
    await expect(page.locator('lt-block-edit .create-card').getByLabel('Already done')).not.toBeChecked();
  });

  test('keep tasks open expands existing pending tasks after reload', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Welcome to Life Towers')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Start empty' }).click();
    await page.waitForSelector('section.modal', { state: 'detached' });

    await page.locator('lt-select-add .top').first().click();
    await page.locator('lt-select-add input[placeholder="Add a value…"]').fill('Ops');
    await page.locator('lt-select-add input[placeholder="Add a value…"]').press('Enter');

    await page.locator('img[alt="Add tower"]').click();
    await page.locator('input[placeholder="New tower"]').fill('Queue');
    await page.locator('lt-tower-settings button[type="submit"]').click();
    await page.waitForSelector('section.modal', { state: 'detached' });

    await page.locator('img[alt="Add block"]').first().click();
    await page.locator('lt-block-edit lt-select-add .top').click();
    await page.locator('lt-block-edit lt-select-add input[placeholder="Add a value…"]').fill('triage');
    await page.locator('lt-block-edit lt-select-add input[placeholder="Add a value…"]').press('Enter');
    await page
      .locator('textarea[placeholder="Write a description here…"]')
      .fill('Clean up alerts');
    await page.getByLabel('Already done').uncheck();
    await page.getByRole('button', { name: 'Create and exit', exact: true }).click();
    await page.waitForSelector('section.modal', { state: 'detached' });

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByText('Keep tasks open').click();
    await page.locator('lt-settings .exit').click();
    await page.waitForSelector('section.modal', { state: 'detached' });

    await page.reload();

    await expect(page.locator('lt-select-add .top').first()).toContainText('Ops', {
      timeout: 15000,
    });
    await expectTaskListOpen(page, 'Clean up alerts');
  });
});
