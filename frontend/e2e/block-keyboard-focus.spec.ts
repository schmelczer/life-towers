import { test, expect, type Page } from '@playwright/test';
import type { DataResponse } from '../src/app/models';

test.use({ serviceWorkers: 'block' });

async function loadTower(page: Page, keepTasksOpen: boolean) {
  const token = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  let account: DataResponse = {
    revision: 0,
    pages: [
      {
        id: 'page',
        name: 'Work',
        keep_tasks_open: keepTasksOpen,
        hide_create_tower_button: false,
        default_date_from: null,
        default_date_to: null,
        towers: [
          {
            id: 'tower',
            name: 'Today',
            base_color: { h: 0.6, s: 0.7, l: 0.55 },
            blocks: [1, 2].map((i) => ({
              id: `old-${i}`,
              tag: 'work',
              description: `Old task ${i}`,
              is_done: !keepTasksOpen,
              difficulty: 1,
              created_at: Math.floor(Date.now() / 1000) - i,
            })),
          },
        ],
      },
    ],
  };
  await page.addInitScript((token) => {
    localStorage.setItem('life-towers.token.v4', token);
  }, token);
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    if (request.url().endsWith('/events')) {
      await route.fulfill({ contentType: 'text/event-stream', body: ': mock stream\n\n' });
    } else if (request.method() === 'PUT') {
      account = { ...request.postDataJSON(), revision: account.revision + 1 };
      await route.fulfill({ json: { revision: account.revision } });
    } else {
      await route.fulfill({ json: account });
    }
  });
  await page.goto('/');
  await expect(page.locator('lt-tower')).toBeVisible();
  return () => account.pages[0].towers[0].blocks;
}

for (const keepTasksOpen of [false, true]) {
  test(`repeated keyboard adds keep focus on the create card (${keepTasksOpen ? 'pending' : 'done'})`, async ({
    page,
  }) => {
    const blocks = await loadTower(page, keepTasksOpen);
    const add = page.getByRole('button', { name: 'Add block', exact: true });
    await add.focus();

    for (const description of ['New task 1', 'New task 2']) {
      await page.keyboard.press('Enter');
      const createCard = page.locator('lt-block-edit .create-card');
      await expect(createCard).toHaveClass(/active/);
      await expect(createCard).toBeFocused();

      // Tab through Close and the category selector to the description. No
      // control on an old task should receive these keystrokes.
      await page.keyboard.press('Tab');
      await expect(createCard.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(createCard.locator('lt-select-add .top')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(createCard.locator('textarea')).toBeFocused();
      await page.keyboard.type(description);
      await page.keyboard.press('Enter');

      await expect(page.locator('lt-block-edit')).toHaveCount(0);
      await expect(add).toBeFocused();
      await expect.poll(() => blocks().at(-1)?.description).toBe(description);
      expect(
        blocks()
          .slice(0, 2)
          .map((b) => b.description),
      ).toEqual(['Old task 1', 'Old task 2']);
    }
  });
}

test('opening an existing task focuses its own card and restores focus on Escape', async ({
  page,
}) => {
  await loadTower(page, true);
  const task = page.getByRole('button', { name: 'Old task 2', exact: true });
  await task.focus();
  await page.keyboard.press('Enter');

  const card = page.locator('lt-block-edit [data-block-id="old-2"]');
  await expect(card).toHaveClass(/active/);
  await expect(card).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(card.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('lt-block-edit')).toHaveCount(0);
  await expect(task).toBeFocused();
});

test('creating a block with the mouse restores focus to Add block', async ({ page }) => {
  const blocks = await loadTower(page, true);
  const add = page.getByRole('button', { name: 'Add block', exact: true });
  await add.click();
  const createCard = page.locator('lt-block-edit .create-card');
  await expect(createCard).toBeFocused();
  await createCard.locator('textarea').fill('Created with the mouse');
  await createCard.getByRole('button', { name: 'Create and exit', exact: true }).click();

  await expect(page.locator('lt-block-edit')).toHaveCount(0);
  await expect(add).toBeFocused();
  await expect.poll(() => blocks().at(-1)?.description).toBe('Created with the mouse');
});
