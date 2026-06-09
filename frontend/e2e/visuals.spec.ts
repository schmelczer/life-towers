import { test } from '@playwright/test';

test.skip(
  process.env['CAPTURE_VISUALS'] !== '1',
  'Set CAPTURE_VISUALS=1 to run the visual screenshot capture suite.',
);

/**
 * Visual capture: drives the UI into key states and writes screenshots
 * for human review of the legacy-styled design.
 */
test.describe('Life Towers visuals', () => {
  test('capture key UI states', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Welcome to Life Towers', { timeout: 15000 });
    await page.waitForTimeout(350); // let the welcome modal finish fade-in
    await page.screenshot({ path: 'visuals/01-welcome-modal.png', fullPage: true });

    // Dismiss the welcome modal with Start empty, then continue.
    await page.getByRole('button', { name: 'Start empty' }).click();
    await page.waitForSelector('section.modal', { state: 'detached' });

    await page.screenshot({ path: 'visuals/01b-empty-state-after-dismiss.png', fullPage: true });

    // Open the page dropdown (without creating a page yet).
    await page.locator('lt-select-add .top').first().click();
    // Wait for the slide-down animation to finish (200ms transform + buffer).
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'visuals/02-page-dropdown-open.png', fullPage: true });

    // Create the page.
    await page.locator('lt-select-add input[placeholder="Add a value…"]').fill('Hobbies');
    await page.locator('lt-select-add input[placeholder="Add a value…"]').press('Enter');
    await page.locator('body').click({ position: { x: 10, y: 400 } });
    await page.waitForTimeout(200);

    // ── Add a tower ─────────────────────────────────────────────────────────
    await page.locator('img[alt="Add tower"]').click();
    await page.waitForSelector('section.modal.active');
    await page.waitForTimeout(350);
    await page.locator('input[placeholder="New tower"]').fill('Reading');
    await page.screenshot({ path: 'visuals/03-new-tower-modal.png', fullPage: true });
    await page.locator('lt-tower-settings button[type="submit"]').click();
    await page.waitForSelector('section.modal', { state: 'detached' });

    // ── Open the block-edit carousel (empty) ────────────────────────────────
    await page.locator('img[alt="Add block"]').first().click();
    await page.waitForSelector('section.modal.active');
    await page.waitForTimeout(350);
    await page.screenshot({ path: 'visuals/04-block-edit-carousel-empty.png', fullPage: true });

    // Fill in the create card. Make this one a NOT-finished task so the
    // tasks accordion has a row to show off (with the tickbox).
    const createCard = page.locator('lt-block-edit .create-card');
    await createCard.locator('lt-select-add .top').click();
    await createCard.locator('lt-select-add input[placeholder="Add a value…"]').fill('novel');
    await createCard.locator('lt-select-add input[placeholder="Add a value…"]').press('Enter');
    await createCard
      .locator('textarea[placeholder="Write a description here…"]')
      .fill('Finish The Brothers Karamazov');
    // Uncheck "Already done" so this becomes a pending task.
    await createCard.getByLabel('Already done').uncheck();
    await page.getByRole('button', { name: 'Create and exit', exact: true }).click();
    await page.waitForSelector('section.modal', { state: 'detached' });

    // Open the tasks accordion to show the new tickbox.
    await page.waitForTimeout(200);
    await page.locator('lt-tasks .header').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'visuals/04b-tasks-accordion-with-tickbox.png', fullPage: true });

    // Hover the tickbox: must NOT pop a scrollbar in the accordion, must NOT
    // paint the global button-underline bar across the top, and the ✓ must stay
    // centred (regression guard — see tasks.component .tickbox::after).
    await page.locator('lt-tasks .tickbox').first().hover();
    await page.waitForTimeout(350);
    await page.locator('lt-tasks .container').screenshot({
      path: 'visuals/04c-tasks-tickbox-hover.png',
    });

    // Add a couple more blocks.
    for (const desc of ['Read about WebAssembly GC', 'Re-read "Out of the Tar Pit"']) {
      await page.locator('img[alt="Add block"]').first().click();
      await page.waitForSelector('section.modal.active');
      await page.waitForTimeout(350);
      const cc = page.locator('lt-block-edit .create-card');
      // Re-use existing tag "novel" — click it from the select-add list.
      await cc.locator('lt-select-add .top').click();
      await page.waitForTimeout(100);
      await cc.locator('textarea[placeholder="Write a description here…"]').fill(desc);
      await page.getByRole('button', { name: 'Create and exit', exact: true }).click();
      await page.waitForSelector('section.modal', { state: 'detached' });
    }

    // Wait for the falling animation to finish.
    await page.waitForTimeout(1800);
    await page.screenshot({ path: 'visuals/05-populated-falling-blocks.png', fullPage: true });

    // ── Open carousel WITH existing blocks ──────────────────────────────────
    await page.locator('img[alt="Add block"]').first().click();
    await page.waitForSelector('section.modal.active');
    await page.waitForTimeout(350);
    await page.screenshot({ path: 'visuals/06-carousel-with-existing.png', fullPage: true });

    // Scroll one card to the left (to focus an existing block, showing neighbour mask).
    await page.locator('lt-block-edit').evaluate((el) => {
      const c = el.querySelector('.carousel') as HTMLElement | null;
      if (c) c.scrollBy({ left: -400, behavior: 'instant' as ScrollBehavior });
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'visuals/07-carousel-existing-focused.png', fullPage: true });

    // Close the carousel via the exit X.
    await page.locator('lt-block-edit .exit').first().click({ force: true });
    await page.waitForSelector('section.modal', { state: 'detached' });

    // ── Add a second tower so we can show drag-drop ─────────────────────────
    await page.locator('img[alt="Add tower"]').click();
    await page.waitForSelector('section.modal.active');
    await page.waitForTimeout(350);
    await page.locator('input[placeholder="New tower"]').fill('Side projects');
    await page.locator('lt-tower-settings button[type="submit"]').click();
    await page.waitForSelector('section.modal', { state: 'detached' });
    await page.waitForTimeout(300);

    // ── Drag a tower over the trash (capture mid-drag) ──────────────────────
    const firstTowerHandle = page.locator('lt-tower').first();
    const trash = page.locator('img.trash');
    const tb = await firstTowerHandle.boundingBox();
    if (tb) {
      // Pick up the tower from its center, then move toward the trash.
      await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2);
      await page.mouse.down();
      // Move in two stages — first to dislodge cdkDrag, then over the trash.
      await page.mouse.move(tb.x + tb.width / 2 + 30, tb.y + tb.height / 2 + 30, { steps: 8 });
      const trb = await trash.boundingBox();
      if (trb) {
        await page.mouse.move(trb.x + trb.width / 2, trb.y + trb.height / 2, { steps: 12 });
        await page.waitForTimeout(300);
        await page.screenshot({ path: 'visuals/08-dragging-over-trash.png', fullPage: true });
      }
      // Actually release over the trash to trigger the confirm-delete modal.
      await page.mouse.up();
      await page.waitForTimeout(400);
      await page.screenshot({ path: 'visuals/08b-confirm-delete-modal.png', fullPage: true });
      // Cancel — don't actually delete the tower.
      await page.locator('.confirm-buttons button').filter({ hasText: 'Cancel' }).click();
      await page.waitForSelector('section.modal', { state: 'detached' });
    }

    // ── Move the date-range slider thumb — blocks should ascend out ────────
    const slider = page.locator('lt-double-slider input[type="range"]').first();
    const sb = await slider.boundingBox();
    if (sb) {
      // Drag the left thumb from 0 toward the right (~80% of slider width).
      await page.mouse.move(sb.x + 4, sb.y + sb.height / 2);
      await page.mouse.down();
      await page.mouse.move(sb.x + sb.width * 0.8, sb.y + sb.height / 2, { steps: 16 });
      await page.mouse.up();
      // Wait long enough for the 1.5s ascend transition.
      await page.waitForTimeout(1700);
      await page.screenshot({ path: 'visuals/09-date-filter-ascended.png', fullPage: true });
      // Restore the range and screenshot the descend back to rest.
      await page.mouse.move(sb.x + sb.width * 0.8, sb.y + sb.height / 2);
      await page.mouse.down();
      await page.mouse.move(sb.x + 4, sb.y + sb.height / 2, { steps: 16 });
      await page.mouse.up();
      await page.waitForTimeout(1700);
      await page.screenshot({ path: 'visuals/10-date-filter-restored.png', fullPage: true });
    }

    // ── Settings modal ──────────────────────────────────────────────────────
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForSelector('section.modal.active');
    await page.waitForTimeout(350);
    await page.screenshot({ path: 'visuals/11-settings-modal.png', fullPage: true });
  });

  test('"Load sample towers" populates a sample page', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Welcome to Life Towers', { timeout: 15000 });
    await page.waitForTimeout(350);
    await page.getByRole('button', { name: 'Load sample towers' }).click();
    await page.waitForSelector('section.modal', { state: 'detached' });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: 'visuals/12-example-data.png', fullPage: true });
  });

  test('Mobile viewport — welcome + example + carousel', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();

    await page.goto((process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:8000') + '/');
    await page.waitForSelector('text=Welcome to Life Towers', { timeout: 15000 });
    await page.waitForTimeout(350);
    await page.screenshot({ path: 'visuals/13-mobile-welcome.png', fullPage: true });

    await page.getByRole('button', { name: 'Load sample towers' }).click();
    await page.waitForSelector('section.modal', { state: 'detached' });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: 'visuals/14-mobile-populated.png', fullPage: true });

    // New-tower modal on mobile — the X button must not overlap the name input.
    await page.locator('img[alt="Add tower"]').click();
    await page.waitForSelector('section.modal.active');
    await page.locator('input[placeholder="New tower"]').fill('A long tower name to test');
    await page.waitForTimeout(350);
    await page.screenshot({ path: 'visuals/14b-mobile-new-tower-modal.png', fullPage: true });
    await page.locator('lt-tower-settings .exit').click({ force: true });
    await page.waitForSelector('section.modal', { state: 'detached' });
    await page.waitForTimeout(350);

    // Open the block-edit carousel for the first tower's first task. The sample
    // page keeps tasks open (keep_tasks_open: true), so the accordion header is
    // absent — only click it when present (i.e. on a collapsed accordion).
    const tasksHeader = page.locator('lt-tasks .header').first();
    if (await tasksHeader.count()) {
      await tasksHeader.click();
      await page.waitForTimeout(400);
    }
    await page.locator('lt-tasks .task-description').first().click();
    await page.waitForSelector('section.modal.active');
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'visuals/15-mobile-carousel.png', fullPage: true });

    await ctx.close();
  });
});
