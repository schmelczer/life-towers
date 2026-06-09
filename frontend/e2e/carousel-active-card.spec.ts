import { test, expect, webkit, chromium, devices, type Browser, type Page } from '@playwright/test';

/**
 * Regression: tapping a block/task must open THAT entry in the block-edit
 * carousel — centered and active — not a different one.
 *
 * This was a real, mobile-only bug (https://schmelczer.dev/towers/). It does NOT
 * reproduce in desktop Chromium at a small viewport — it needs a true mobile
 * engine. On WebKit (iOS Safari) the carousel's opening `scrollTo` ran in a
 * microtask right after the modal host is reparented to <body>, before the
 * snap container's scroll range was established, so it no-op'd and every tap
 * surfaced the same wrong card. Hence this spec drives real WebKit + Chromium
 * mobile profiles directly rather than relying on the configured project.
 *
 *   docker compose -f docker-compose.dev.yml up --build -d
 *   PLAYWRIGHT_BASE_URL=http://life-towers:8000 npx playwright test carousel-active-card
 *   docker compose -f docker-compose.dev.yml down -v
 */

const BASE = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:8000';

async function loadSample(page: Page): Promise<void> {
  await page.goto(BASE + '/');
  await page.waitForSelector('text=Welcome to Life Towers', { timeout: 15000 });
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: 'Load sample towers' }).click();
  await page.waitForSelector('section.modal', { state: 'detached' });
  await page.waitForTimeout(1800); // let the falling animation settle
}

/** Centre offset (px) of the active card relative to the carousel viewport. */
async function activeCardOffCenter(page: Page): Promise<number> {
  return page.evaluate(() => {
    const c = document.querySelector('lt-block-edit .carousel') as HTMLElement | null;
    const card = document.querySelector('lt-block-edit .card.active') as HTMLElement | null;
    if (!c || !card) return 9999;
    const cr = c.getBoundingClientRect();
    const kr = card.getBoundingClientRect();
    return Math.round(kr.left + kr.width / 2 - (cr.left + cr.width / 2));
  });
}

async function closeCarousel(page: Page): Promise<void> {
  await page.locator('lt-block-edit .exit').first().click({ force: true });
  await page.waitForSelector('section.modal', { state: 'detached' });
  await page.waitForTimeout(150);
}

async function runSuite(browser: Browser, deviceName: string): Promise<void> {
  const ctx = await browser.newContext({ ...devices[deviceName] });
  const page = await ctx.newPage();
  await loadSample(page);

  // ── Done blocks ───────────────────────────────────────────────────────────
  // Tap a sample (first / middle / last) of the Reading tower's falling squares
  // and confirm each opens — and centers — its own card.
  const reading = page.locator('lt-tower').nth(0);
  const squares = reading.locator('lt-block');
  const ids: string[] = [];
  for (let i = 0; i < (await squares.count()); i++) {
    const id = await squares.nth(i).getAttribute('data-block-id');
    if (id && !ids.includes(id)) ids.push(id);
  }
  expect(ids.length).toBeGreaterThan(2);

  for (const id of [ids[0], ids[Math.floor(ids.length / 2)], ids[ids.length - 1]]) {
    await reading.locator(`lt-block[data-block-id="${id}"]`).first().tap();
    await page.waitForSelector('section.modal.active');
    await page.waitForTimeout(700); // open scroll + the 150ms adjustPosition settle
    await expect(page.locator('lt-block-edit .card.active')).toHaveAttribute('data-block-id', id);
    expect(Math.abs(await activeCardOffCenter(page))).toBeLessThan(30);
    await closeCarousel(page);
  }

  // ── Pending task ──────────────────────────────────────────────────────────
  // Tap the 2nd task of the Side projects tower (it has two); the active card's
  // description must be the one we tapped.
  const sideProjects = page.locator('lt-tower').nth(1);
  const header = sideProjects.locator('lt-tasks .header');
  if (await header.count()) {
    await header.first().click();
    await page.waitForTimeout(400);
  }
  const task = sideProjects.locator('lt-tasks .task-description').nth(1);
  const taskText = (await task.innerText()).trim();
  await task.tap();
  await page.waitForSelector('section.modal.active');
  await page.waitForTimeout(700);
  await expect(page.locator('lt-block-edit .card.active textarea')).toHaveValue(taskText);
  expect(Math.abs(await activeCardOffCenter(page))).toBeLessThan(30);
  await closeCarousel(page);

  await ctx.close();
}

test('WebKit mobile: tapping a block/task opens its own carousel card', async () => {
  const browser = await webkit.launch();
  try {
    await runSuite(browser, 'iPhone 13');
  } finally {
    await browser.close();
  }
});

test('Chromium mobile: tapping a block/task opens its own carousel card', async () => {
  const browser = await chromium.launch();
  try {
    await runSuite(browser, 'Pixel 7');
  } finally {
    await browser.close();
  }
});
