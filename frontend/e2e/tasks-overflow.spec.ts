import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * Regression guard for the tasks accordion ("todos") double-scrollbar bug.
 *
 * When the pending-task list is tall it must show EXACTLY ONE scrollbar (inside
 * the white card), not two. The cause was two nested scroll containers both
 * firing: the `lt-tasks` host (overflow:auto) AND the inner `.container` card
 * (overflow-y:auto). The fix makes the host a height-bounding flex column that
 * only CLIPS, leaving the inner card as the sole scroller.
 *
 * Seeds many pending tasks via a direct PUT (far more robust than driving the
 * carousel ~18 times), then reloads so the store renders the seeded tree. All
 * ids are generated here in Node — `crypto.randomUUID()` throws in the page
 * because the dev origin is plain HTTP (not a secure context).
 */
test('tasks accordion with many tasks shows a single scrollbar', async ({ page }) => {
  await page.goto('/');

  // init() mints + registers a token on load; wait for it to land.
  await page.waitForFunction(() => !!localStorage.getItem('life-towers.token.v4'), null, {
    timeout: 15000,
  });

  // Build a tree: one page, one tower, many PENDING (is_done:false) tasks.
  const now = Math.floor(Date.now() / 1000);
  const tree = {
    pages: [
      {
        id: randomUUID(),
        name: 'Hobbies',
        hide_create_tower_button: false,
        keep_tasks_open: false,
        default_date_from: null,
        default_date_to: null,
        towers: [
          {
            id: randomUUID(),
            name: 'Reading',
            base_color: { h: 0.92, s: 0.7, l: 0.55 },
            blocks: Array.from({ length: 18 }, (_, i) => ({
              id: randomUUID(),
              tag: 'novel',
              description: `Pending task ${i + 1} — read another chapter tonight`,
              is_done: false,
              difficulty: 1,
              created_at: now - i * 3600,
            })),
          },
        ],
      },
    ],
  };

  // PUT the tree (unguarded — no If-Match), then reload to render it.
  const status = await page.evaluate(async (body) => {
    const res = await fetch('api/v1/data', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('life-towers.token.v4')}`,
      },
      body: JSON.stringify(body),
    });
    return res.status;
  }, tree);
  expect(status).toBe(200);

  await page.reload();
  await page.waitForSelector('lt-tower', { timeout: 15000 });

  // Open the accordion (collapsed by default since keep_tasks_open is false).
  await page.locator('lt-tasks .header').first().click();
  await page.waitForTimeout(400); // expand animation (200ms) + buffer

  // Measure the scroll topology in the accordion subtree.
  const m = await page.locator('lt-tasks').first().evaluate((host) => {
    const card = host.querySelector('.container') as HTMLElement;
    const cs = (el: Element) => getComputedStyle(el);
    const overflows = (el: HTMLElement) => el.scrollHeight > el.clientHeight + 1;
    return {
      hostOverflowY: cs(host).overflowY,
      cardOverflowY: cs(card).overflowY,
      cardOverflows: overflows(card),
      hostHasOwnOverflow: host.scrollHeight > host.clientHeight + 1,
      hostHeight: host.getBoundingClientRect().height,
      cardHeight: card.getBoundingClientRect().height,
      viewport30vh: window.innerHeight * 0.3,
    };
  });

  // The list must actually overflow, otherwise the test proves nothing.
  expect(m.cardOverflows).toBe(true);

  // Exactly one scroller: the inner card. The host only clips.
  expect(m.hostOverflowY).toBe('hidden');
  expect(m.cardOverflowY).toBe('auto');
  // The host has no overflowing content of its own → no second scrollbar.
  expect(m.hostHasOwnOverflow).toBe(false);
  // The card shrank to fit within the host's bound (not clipped past it).
  expect(m.cardHeight).toBeLessThanOrEqual(m.hostHeight + 1);
  // Host height is capped by min(30vh, 45%) → at most ~30vh.
  expect(m.hostHeight).toBeLessThanOrEqual(m.viewport30vh + 2);

  await page.locator('lt-tasks .container').first().screenshot({
    path: 'visuals/04d-tasks-accordion-overflow-single-scrollbar.png',
  });
});
