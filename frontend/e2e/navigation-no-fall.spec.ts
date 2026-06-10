import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * Regression: navigating between pages must NOT replay the falling animation.
 *
 * The bug: `lt-page` (and its date-range slider) were reused across navigation,
 * so the previous page's stale `dateRange` was applied to the destination page's
 * towers on their first render. When the destination's blocks are NEWER than the
 * stale range they render off-screen (ascending) and then visibly "fall" in a
 * frame later when the slider corrects the range — i.e. all blocks fall at once.
 * The fix rebuilds the `lt-page` subtree on page-id change (fresh slider/filter),
 * matching a reload. This guards the destination ("Newer") page against falling.
 *
 * We detect a fall directly: hook the WAAPI `el.animate` used by `playFall` and
 * the `.descend`/`.ascend` CSS `transitionrun`, both on `lt-block` hosts. These
 * fire at the JS layer regardless of headless rendering, so the check is stable.
 *
 * The two pages are seeded into the offline cache with DISJOINT date ranges
 * (destination strictly newer) — the precise condition that triggered the bug.
 *
 * All ids (and the token) are generated here in Node — `crypto.randomUUID()`
 * throws inside the page on the CI origin (http://life-towers:8000), which is
 * plain HTTP and therefore not a secure context.
 */
test.describe('navigation does not replay the falling animation', () => {
  test('navigating to a newer-dated page keeps blocks at rest', async ({ page }) => {
    const nowSec = Math.floor(Date.now() / 1000);
    const HOUR = 3600;
    const DAY = 86400;

    // baseAgeDays/spacingHrs place each page's done blocks in its own window.
    const tower = (name: string, h: number, baseAgeDays: number) => ({
      id: randomUUID(),
      name,
      base_color: { h, s: 0.7, l: 0.55 },
      blocks: [
        { id: randomUUID(), tag: 't', description: 'pending', is_done: false, difficulty: 2, created_at: nowSec },
        ...Array.from({ length: 6 }, (_unused, i) => ({
          id: randomUUID(),
          tag: 't',
          description: `done ${i}`,
          is_done: true,
          difficulty: 1 + (i % 3),
          created_at: nowSec - baseAgeDays * DAY - (i + 1) * 6 * HOUR,
        })),
      ],
    });
    const mkPage = (name: string, h: number, baseAgeDays: number) => ({
      id: randomUUID(),
      name,
      hide_create_tower_button: false,
      keep_tasks_open: false,
      default_date_from: null,
      default_date_to: null,
      towers: [tower(name + ' A', h, baseAgeDays), tower(name + ' B', h + 0.2, baseAgeDays)],
    });
    // Page 0 ("Older") is the post-reload default; "Newer" is strictly more recent.
    const tree = { pages: [mkPage('Older', 0.05, 6), mkPage('Newer', 0.55, 1)] };
    const token = randomUUID();

    await page.addInitScript(
      ({ tree, token }) => {
        localStorage.setItem('life-towers.token.v4', token);
        localStorage.setItem('life-towers.cache.v4.' + token, JSON.stringify(tree));

        // Fall detectors on lt-block hosts (WAAPI playFall + CSS descend/ascend).
        (window as unknown as { __falls: number }).__falls = 0;
        const isBlock = (el: EventTarget | null) =>
          el instanceof Element && el.tagName === 'LT-BLOCK';
        const origAnimate = Element.prototype.animate;
        Element.prototype.animate = function (kf: unknown, opts?: unknown) {
          try {
            const s = JSON.stringify(kf ?? '');
            if (isBlock(this) && (s.includes('translateY') || s.includes('transform')))
              (window as unknown as { __falls: number }).__falls++;
          } catch {
            /* ignore */
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return origAnimate.call(this, kf as any, opts as any);
        };
        document.addEventListener(
          'transitionrun',
          (e) => {
            if ((e as TransitionEvent).propertyName === 'transform' && isBlock(e.target))
              (window as unknown as { __falls: number }).__falls++;
          },
          true,
        );
      },
      { tree, token },
    );

    await page.goto('/');
    // Lands on "Older"; wait for its stack to render and settle.
    await page.waitForSelector('lt-block', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Reset the detector right before navigation, then switch to "Newer".
    await page.evaluate(() => ((window as unknown as { __falls: number }).__falls = 0));
    await page.locator('lt-select-add .top').first().click();
    await page.locator('lt-select-add .option', { hasText: 'Newer' }).first().click();

    // Give any fall a full beat to fire (the animation is 1.5s).
    await page.waitForTimeout(1800);

    const falls = await page.evaluate(() => (window as unknown as { __falls: number }).__falls);
    expect(falls, 'block fall animations fired on navigation').toBe(0);
    // Sanity: the destination page actually rendered its blocks.
    expect(await page.locator('lt-block').count()).toBeGreaterThan(0);
  });
});
