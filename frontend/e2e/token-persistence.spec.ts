import { test, expect, type Page } from '@playwright/test';
import type { DataResponse, TreeDto } from '../src/app/models';

test.use({ serviceWorkers: 'block' });

// Every account endpoint is intercepted. The map survives browser reloads,
// just like server-side accounts, while each test has its own isolated data.
async function mockAccounts(page: Page) {
  const accounts = new Map<string, DataResponse>();
  const writes: string[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const endpoint = new URL(request.url()).pathname.split('/').at(-1);
    const token = request.headers()['authorization']?.replace(/^Bearer /, '') ?? '';
    if (endpoint === 'register') {
      const registered = (request.postDataJSON() as { token: string }).token;
      if (!accounts.has(registered)) accounts.set(registered, { pages: [], revision: 0 });
      await route.fulfill({ json: { user_id: registered } });
    } else if (endpoint === 'data') {
      const account = accounts.get(token);
      if (!account) {
        await route.fulfill({ status: 401, json: { error: 'unauthorized' } });
      } else if (request.method() === 'PUT') {
        const tree = request.postDataJSON() as TreeDto;
        if (request.headers()['if-match'] !== String(account.revision)) {
          await route.fulfill({ status: 409, json: { revision: account.revision } });
          return;
        }
        const revision = account.revision + 1;
        accounts.set(token, { ...tree, revision });
        writes.push(token);
        await route.fulfill({ json: { revision } });
      } else {
        await route.fulfill({ json: account });
      }
    } else if (endpoint === 'events') {
      await route.fulfill({ contentType: 'text/event-stream', body: ': mock stream\n\n' });
    } else if (endpoint === 'health') {
      await route.fulfill({ json: { status: 'ok' } });
    } else {
      throw new Error(`Unexpected mocked API endpoint: ${endpoint}`);
    }
  });
  await page.route('https://stats.schmelczer.dev/**', (route) => route.abort());
  return { accounts, writes };
}

async function addPage(page: Page, name: string) {
  await page.locator('lt-select-add .top').first().click();
  const input = page.getByPlaceholder('Add a value…');
  await input.fill(name);
  await input.press('Enter');
}

async function acknowledgeRecovery(page: Page) {
  await page.getByRole('checkbox', { name: 'I have saved this recovery token' }).check();
  await page.getByRole('button', { name: 'Continue saving' }).click();
}

for (const fault of ['getter throws', 'write throws', 'write ignored'] as const) {
  test(`recovers after reload when storage ${fault}`, async ({ page }) => {
    const { accounts, writes } = await mockAccounts(page);
    await page.addInitScript((fault) => {
      if (fault === 'getter throws') {
        Object.defineProperty(window, 'localStorage', {
          get() {
            throw new DOMException('Storage denied', 'SecurityError');
          },
        });
      } else {
        Storage.prototype.setItem = () => {
          if (fault === 'write throws')
            throw new DOMException('Storage full', 'QuotaExceededError');
        };
      }
      Object.defineProperty(navigator, 'clipboard', {
        value:
          fault === 'write throws'
            ? undefined
            : {
                async writeText(text: string) {
                  if (fault === 'write ignored')
                    throw new DOMException('Clipboard denied', 'NotAllowedError');
                  Object.assign(window, { copiedRecoveryToken: text });
                },
              },
      });
    }, fault);
    await page.goto('/');

    const dialog = page.getByRole('dialog', { name: 'Save your recovery token' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('alert')).toContainText(
      'Your browser cannot remember this account',
    );
    await expect(page.getByRole('button', { name: 'Start empty' })).toHaveCount(0);
    await expect(page.locator('lt-select-add')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Continue saving' })).toBeDisabled();
    await page.keyboard.press('Escape');
    await page.locator('section.modal').click({ position: { x: 2, y: 2 } });
    await expect(dialog).toBeVisible();
    expect(writes).toHaveLength(0);

    const recoveryToken = await page.getByLabel('Your account token').inputValue();
    await page.getByRole('button', { name: 'Copy', exact: true }).click();
    if (fault === 'getter throws') {
      await expect(page.getByRole('status')).toContainText('Token copied');
      expect(
        await page.evaluate(
          () => (window as Window & { copiedRecoveryToken?: string }).copiedRecoveryToken,
        ),
      ).toBe(recoveryToken);
    } else {
      await expect(page.getByText('Could not copy automatically.')).toBeVisible();
    }
    // A clipboard operation alone must never acknowledge durable recovery.
    await expect(page.getByRole('button', { name: 'Continue saving' })).toBeDisabled();
    await acknowledgeRecovery(page);
    await page.getByRole('button', { name: 'Start empty' }).click();
    await expect(page.locator('.recovery-reminder')).toBeVisible();

    await addPage(page, 'Recover this page');
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]).toBe(recoveryToken);

    await page.reload();
    await expect(dialog).toBeVisible();
    const newToken = await page.getByLabel('Your account token').inputValue();
    expect(newToken).not.toBe(recoveryToken);
    await expect.poll(() => accounts.size).toBe(2);
    expect(accounts.get(recoveryToken)?.pages[0].name).toBe('Recover this page');
    expect(accounts.get(newToken)?.pages).toEqual([]);

    await page.getByLabel('Paste token to switch account').fill(recoveryToken);
    await page.getByRole('button', { name: 'Switch', exact: true }).click();
    await expect(page.getByLabel('Your account token')).toHaveValue(recoveryToken);
    await expect(page.getByRole('button', { name: 'Continue saving' })).toBeDisabled();
    await acknowledgeRecovery(page);
    await expect(page.locator('lt-select-add .top').first()).toContainText('Recover this page');
    expect(writes).toEqual([recoveryToken]);
  });
}

test('persistent sessions reopen the same saved account without a recovery prompt', async ({
  page,
}) => {
  const { accounts, writes } = await mockAccounts(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Start empty' }).click();
  const token = await page.evaluate(() => localStorage.getItem('life-towers.token.v4'));
  await addPage(page, 'Persistent account');
  await expect.poll(() => writes.length).toBe(1);

  await page.reload();

  await expect(page.locator('lt-select-add .top').first()).toContainText('Persistent account');
  expect(await page.evaluate(() => localStorage.getItem('life-towers.token.v4'))).toBe(token);
  expect(accounts.size).toBe(1);
  expect(writes).toEqual([token]);
  await expect(page.getByRole('dialog', { name: 'Save your recovery token' })).toHaveCount(0);
  await expect(page.locator('.recovery-reminder')).toHaveCount(0);
});

test('recovery prompt fits a mobile viewport', async ({ page }) => {
  await mockAccounts(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage denied', 'SecurityError');
      },
    });
  });
  await page.goto('/');
  const dialog = page.getByRole('dialog', { name: 'Save your recovery token' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue saving' })).toBeInViewport();
  await expect(page.getByLabel('Paste token to switch account')).toBeInViewport();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350); // Capture after the modal's entry transition.
  await page.screenshot({ path: 'visuals/16-mobile-token-recovery.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: 'visuals/17-desktop-token-recovery.png', fullPage: true });
});
