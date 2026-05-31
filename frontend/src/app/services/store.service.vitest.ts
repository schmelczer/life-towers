import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { StoreService } from './store.service';
import { ApiService } from './api.service';
import { AnalyticsService } from './analytics.service';
import type { TreeDto } from '../models';

// ── localStorage stub ────────────────────────────────────────────────────────
const storage: Record<string, string> = {};
let storageThrowsOnSet = false;
const localStorageStub = {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => {
    if (storageThrowsOnSet) throw new Error('QuotaExceededError');
    storage[k] = v;
  },
  removeItem: (k: string) => {
    delete storage[k];
  },
  clear: () => Object.keys(storage).forEach((k) => delete storage[k]),
  key: (i: number) => Object.keys(storage)[i] ?? null,
  get length() {
    return Object.keys(storage).length;
  },
};
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageStub,
  configurable: true,
  writable: true,
});

// ── crypto stub for tests that need deterministic UUIDs ─────────────────────
const realCrypto = globalThis.crypto;
function withFixedUuid<T>(uuid: string, fn: () => T): T {
  const stub = {
    randomUUID: () => uuid,
    getRandomValues: realCrypto.getRandomValues.bind(realCrypto),
  };
  Object.defineProperty(globalThis, 'crypto', { value: stub, configurable: true });
  try {
    return fn();
  } finally {
    Object.defineProperty(globalThis, 'crypto', { value: realCrypto, configurable: true });
  }
}

// ── Mock ApiService factory ──────────────────────────────────────────────────
interface MockApi {
  register: ReturnType<typeof vi.fn>;
  getData: ReturnType<typeof vi.fn>;
  putData: ReturnType<typeof vi.fn>;
  health: ReturnType<typeof vi.fn>;
}

function makeMockApi(): MockApi {
  return {
    health: vi.fn().mockResolvedValue({ status: 'ok' }),
    register: vi.fn().mockResolvedValue({ user_id: 'u' }),
    getData: vi.fn().mockResolvedValue({ pages: [] } satisfies TreeDto),
    putData: vi.fn().mockResolvedValue(undefined),
  };
}

const FIXED_UUID = '11111111-2222-4333-8444-555555555555';
const TOKEN_KEY = 'life-towers.token.v4';
const CACHE_KEY = `life-towers.cache.v4.${FIXED_UUID}`;
const PENDING_CACHE_KEY = `life-towers.cache-pending.v4.${FIXED_UUID}`;
const OTHER_TOKEN = 'aaaabbbb-cccc-4ddd-8eee-ffffffffffff';
const OTHER_CACHE_KEY = `life-towers.cache.v4.${OTHER_TOKEN}`;

// ── Helpers ──────────────────────────────────────────────────────────────────
function configure(api: MockApi): StoreService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: ApiService, useValue: api },
      {
        provide: AnalyticsService,
        useValue: {
          init: vi.fn(),
          trackStart: vi.fn(),
          trackExampleLoaded: vi.fn(),
          trackPageCreated: vi.fn(),
          trackTowerCreated: vi.fn(),
          trackBlockCreated: vi.fn(),
          trackBlockCompleted: vi.fn(),
        },
      },
      StoreService,
    ],
  });
  return TestBed.inject(StoreService);
}

function mkPage(name: string): TreeDto['pages'][number] {
  return {
    id: FIXED_UUID,
    name,
    hide_create_tower_button: false,
    keep_tasks_open: false,
    default_date_from: null,
    default_date_to: null,
    towers: [],
  };
}

// HttpErrorResponse-compatible shape for rejected promises.
function httpError(status: number, headers: Record<string, string> = {}) {
  const headersObj = {
    get: (n: string) =>
      headers[n] ?? headers[n.toLowerCase()] ?? headers[n.toUpperCase()] ?? null,
  };
  const err: { status: number; headers: typeof headersObj } = { status, headers: headersObj };
  return err;
}

describe('StoreService', () => {
  beforeEach(() => {
    localStorageStub.clear();
    storageThrowsOnSet = false;
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Init ───────────────────────────────────────────────────────────────────

  it('mints + persists a UUIDv4 token and calls register on first launch', async () => {
    const api = makeMockApi();
    const store = configure(api);

    await withFixedUuid(FIXED_UUID, async () => {
      await store.init();
    });

    expect(storage[TOKEN_KEY]).toBe(FIXED_UUID);
    expect(api.register).toHaveBeenCalledWith(FIXED_UUID);
    expect(api.getData).toHaveBeenCalledWith(FIXED_UUID);
    expect(store.loading()).toBe(false);
  });

  it('reuses an existing stored token without re-registering', async () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    const api = makeMockApi();
    const store = configure(api);

    await store.init();

    expect(api.register).not.toHaveBeenCalled();
    expect(store.token()).toBe(FIXED_UUID);
  });

  it('canonicalizes a stored uppercase token', async () => {
    storage[TOKEN_KEY] = FIXED_UUID.toUpperCase();
    const api = makeMockApi();
    const store = configure(api);

    await store.init();

    expect(storage[TOKEN_KEY]).toBe(FIXED_UUID);
    expect(api.getData).toHaveBeenCalledWith(FIXED_UUID);
    expect(store.token()).toBe(FIXED_UUID);
  });

  it('rejects a non-UUIDv4 stored token and mints a fresh one', async () => {
    storage[TOKEN_KEY] = 'not-a-uuid';
    const api = makeMockApi();
    const store = configure(api);

    await withFixedUuid(FIXED_UUID, async () => {
      await store.init();
    });

    expect(api.register).toHaveBeenCalledWith(FIXED_UUID);
  });

  it('on 401 from getData, re-registers the SAME token (idempotent) and retries', async () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    const api = makeMockApi();
    api.getData
      .mockRejectedValueOnce(httpError(401))
      .mockResolvedValueOnce({ pages: [mkPage('after-401')] });
    const store = configure(api);

    await store.init();

    expect(api.register).toHaveBeenCalledTimes(1);
    expect(api.register).toHaveBeenCalledWith(FIXED_UUID);
    expect(api.getData).toHaveBeenCalledTimes(2);
    expect(store.pages()).toHaveLength(1);
    expect(store.pages()[0].name).toBe('after-401');
  });

  it('falls back to cache on non-401 network error', async () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    storage[CACHE_KEY] = JSON.stringify({ pages: [mkPage('cached')] } satisfies TreeDto);
    const api = makeMockApi();
    api.getData.mockRejectedValue(httpError(0));
    const store = configure(api);

    await store.init();

    expect(store.pages()).toHaveLength(1);
    expect(store.pages()[0].name).toBe('cached');
  });

  it('keeps local cache when server returns empty but cache has data', async () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    storage[CACHE_KEY] = JSON.stringify({ pages: [mkPage('offline-edit')] } satisfies TreeDto);
    const api = makeMockApi();
    api.getData.mockResolvedValue({ pages: [] });
    const store = configure(api);

    await store.init();

    expect(store.pages()).toHaveLength(1);
    expect(store.pages()[0].name).toBe('offline-edit');
  });

  it('init() doesn\'t crash if localStorage.setItem throws (private mode)', async () => {
    storageThrowsOnSet = true;
    const api = makeMockApi();
    const store = configure(api);

    await withFixedUuid(FIXED_UUID, async () => {
      await expect(store.init()).resolves.toBeUndefined();
    });
    expect(store.loading()).toBe(false);
  });

  it('init() is single-flight — concurrent calls return the same promise', async () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    const api = makeMockApi();
    let resolveGet: ((v: TreeDto) => void) | null = null;
    api.getData.mockReturnValue(new Promise<TreeDto>((res) => (resolveGet = res)));
    const store = configure(api);

    const p1 = store.init();
    const p2 = store.init();
    resolveGet!({ pages: [] });
    await Promise.all([p1, p2]);

    expect(api.getData).toHaveBeenCalledTimes(1);
  });

  it('moves a pending block to the end when it becomes done', async () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    const api = makeMockApi();
    api.getData.mockResolvedValue({
      pages: [
        {
          id: 'page-1',
          name: 'Page',
          hide_create_tower_button: false,
          keep_tasks_open: false,
          default_date_from: null,
          default_date_to: null,
          towers: [
            {
              id: 'tower-1',
              name: 'Tower',
              base_color: { h: 0.5, s: 0.5, l: 0.5 },
              blocks: [
                {
                  id: 'old-pending',
                  tag: 'a',
                  description: 'Created first, completed last',
                  is_done: false,
                  difficulty: 1,
                  created_at: 100,
                },
                {
                  id: 'newer-pending',
                  tag: 'b',
                  description: 'Still pending',
                  is_done: false,
                  difficulty: 1,
                  created_at: 300,
                },
                {
                  id: 'existing-done',
                  tag: 'c',
                  description: 'Already done',
                  is_done: true,
                  difficulty: 1,
                  created_at: 200,
                },
              ],
            },
          ],
        },
      ],
    } satisfies TreeDto);
    const store = configure(api);
    await store.init();

    store.updateBlock('page-1', 'tower-1', 'old-pending', { is_done: true });

    const blocks = store.pages()[0].towers[0].blocks;
    expect(blocks.map((b) => b.id)).toEqual([
      'newer-pending',
      'existing-done',
      'old-pending',
    ]);
    expect(blocks[2].created_at).toBe(100);
  });

  it('loads welcome example data with a stack of completed squares per tower', () => {
    const api = makeMockApi();
    const store = configure(api);

    const pageId = store.loadExample();

    const [page] = store.pages();
    expect(page.id).toBe(pageId);
    expect(page.name).toBe('Hobbies');
    expect(page.towers).toHaveLength(3);

    const doneBlocks = page.towers.flatMap((tower) => tower.blocks.filter((b) => b.is_done));
    const doneSquares = doneBlocks.reduce((sum, block) => sum + block.difficulty, 0);
    expect(doneSquares).toBeGreaterThanOrEqual(90);
    expect(new Set(page.towers.flatMap((tower) => tower.blocks.map((b) => b.difficulty))).size)
      .toBeGreaterThan(1);

    for (const tower of page.towers) {
      const doneDates = tower.blocks.filter((b) => b.is_done).map((b) => b.created_at);
      const doneSquareCount = tower.blocks
        .filter((b) => b.is_done)
        .reduce((sum, block) => sum + block.difficulty, 0);
      expect(doneSquareCount).toBeGreaterThanOrEqual(30);
      expect(doneDates).toEqual([...doneDates].sort((a, b) => a - b));
      expect(new Set(tower.blocks.map((b) => b.difficulty)).size).toBeGreaterThan(1);
    }

    store.ngOnDestroy();
  });

  // ── Debounced save ─────────────────────────────────────────────────────────

  it('debounces saves: multiple mutations within 750ms → one PUT', async () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    const api = makeMockApi();
    const store = configure(api);
    await store.init();

    store.addPage('A');
    store.addPage('B');
    store.addPage('C');

    expect(api.putData).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(750);
    expect(api.putData).toHaveBeenCalledTimes(1);
    expect(storage[PENDING_CACHE_KEY]).toBeUndefined();
    const [, tree] = api.putData.mock.calls[0];
    expect((tree as TreeDto).pages).toHaveLength(3);
  });

  it('mutation while a save is in-flight triggers a follow-up save', async () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    const api = makeMockApi();
    let resolveFirstPut: (() => void) | null = null;
    api.putData
      .mockReturnValueOnce(new Promise<void>((res) => (resolveFirstPut = () => res())))
      .mockResolvedValueOnce(undefined);
    const store = configure(api);
    await store.init();

    store.addPage('first');
    await vi.advanceTimersByTimeAsync(750);
    expect(api.putData).toHaveBeenCalledTimes(1);

    // Mutate while first PUT is still hanging.
    store.addPage('second');

    // Finish the first save → follow-up should be scheduled.
    resolveFirstPut!();
    await vi.advanceTimersByTimeAsync(750);

    expect(api.putData).toHaveBeenCalledTimes(2);
    const lastTree = api.putData.mock.calls[1][1] as TreeDto;
    expect(lastTree.pages).toHaveLength(2);
  });

  it('does not let an older in-flight save clear a newer pending cache entry', async () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    const api = makeMockApi();
    let resolveFirstPut: (() => void) | null = null;
    api.putData
      .mockReturnValueOnce(new Promise<void>((res) => (resolveFirstPut = () => res())))
      .mockResolvedValueOnce(undefined);
    const store = configure(api);
    await store.init();

    store.addPage('first');
    await vi.advanceTimersByTimeAsync(750);
    expect(api.putData).toHaveBeenCalledTimes(1);

    store.addPage('second');
    expect(JSON.parse(storage[CACHE_KEY]).pages.map((p: TreeDto['pages'][number]) => p.name))
      .toEqual(['first', 'second']);
    expect(storage[PENDING_CACHE_KEY]).toBe('1');

    resolveFirstPut!();
    await vi.advanceTimersByTimeAsync(0);

    expect(JSON.parse(storage[CACHE_KEY]).pages.map((p: TreeDto['pages'][number]) => p.name))
      .toEqual(['first', 'second']);
    expect(storage[PENDING_CACHE_KEY]).toBe('1');

    await vi.advanceTimersByTimeAsync(750);
    expect(api.putData).toHaveBeenCalledTimes(2);
    expect(storage[PENDING_CACHE_KEY]).toBeUndefined();
  });

  it('keeps a pending local mutation across reload before the debounce saves', async () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    const api = makeMockApi();
    const serverPage = mkPage('server');
    api.getData.mockResolvedValue({ pages: [serverPage] });
    const store = configure(api);
    await store.init();

    store.updatePage(FIXED_UUID, { keep_tasks_open: true });

    expect(JSON.parse(storage[CACHE_KEY]).pages[0].keep_tasks_open).toBe(true);
    expect(storage[PENDING_CACHE_KEY]).toBe('1');
    store.ngOnDestroy();

    const reloadedApi = makeMockApi();
    reloadedApi.getData.mockResolvedValue({ pages: [serverPage] });
    const reloadedStore = configure(reloadedApi);
    await reloadedStore.init();

    expect(reloadedStore.pages()[0].keep_tasks_open).toBe(true);

    await vi.advanceTimersByTimeAsync(750);
    expect(reloadedApi.putData).toHaveBeenCalledTimes(1);
    const [, tree] = reloadedApi.putData.mock.calls[0];
    expect((tree as TreeDto).pages[0].keep_tasks_open).toBe(true);
  });

  it('does not let a stale in-flight save clear a newer pending settings cache', async () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    const api = makeMockApi();
    const serverPage = mkPage('server');
    let resolveFirstPut: (() => void) | null = null;
    api.getData.mockResolvedValue({ pages: [serverPage] });
    api.putData
      .mockReturnValueOnce(new Promise<void>((res) => (resolveFirstPut = () => res())))
      .mockResolvedValueOnce(undefined);
    const store = configure(api);
    await store.init();

    store.updatePage(FIXED_UUID, { name: 'renamed' });
    await vi.advanceTimersByTimeAsync(750);
    expect(api.putData).toHaveBeenCalledTimes(1);
    expect((api.putData.mock.calls[0][1] as TreeDto).pages[0].keep_tasks_open).toBe(false);

    store.updatePage(FIXED_UUID, { keep_tasks_open: true });
    expect(JSON.parse(storage[CACHE_KEY]).pages[0].keep_tasks_open).toBe(true);
    expect(storage[PENDING_CACHE_KEY]).toBe('1');

    resolveFirstPut!();
    await vi.advanceTimersByTimeAsync(0);
    expect(JSON.parse(storage[CACHE_KEY]).pages[0].keep_tasks_open).toBe(true);
    expect(storage[PENDING_CACHE_KEY]).toBe('1');

    await vi.advanceTimersByTimeAsync(750);
    expect(api.putData).toHaveBeenCalledTimes(2);
    expect((api.putData.mock.calls[1][1] as TreeDto).pages[0].keep_tasks_open).toBe(true);
    expect(JSON.parse(storage[CACHE_KEY]).pages[0].keep_tasks_open).toBe(true);
    expect(storage[PENDING_CACHE_KEY]).toBeUndefined();
  });

  // ── Error handling ────────────────────────────────────────────────────────

  it('marks status "too-large" on 413 and does NOT retry', async () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    const api = makeMockApi();
    api.putData.mockRejectedValue(httpError(413));
    const store = configure(api);
    await store.init();

    store.addPage('big');
    await vi.advanceTimersByTimeAsync(750);
    await vi.runAllTimersAsync();

    expect(store.saveStatus()).toBe('too-large');
    expect(api.putData).toHaveBeenCalledTimes(1);
  });

  it('marks status "invalid" on 400 and does NOT retry', async () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    const api = makeMockApi();
    api.putData.mockRejectedValue(httpError(400));
    const store = configure(api);
    await store.init();

    store.addPage('bad');
    await vi.advanceTimersByTimeAsync(750);
    await vi.runAllTimersAsync();

    expect(store.saveStatus()).toBe('invalid');
    expect(api.putData).toHaveBeenCalledTimes(1);
  });

  it('honors Retry-After on 429 (uses it as the next delay)', async () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    const api = makeMockApi();
    api.putData
      .mockRejectedValueOnce(httpError(429, { 'Retry-After': '2' }))
      .mockResolvedValueOnce(undefined);
    const store = configure(api);
    await store.init();

    store.addPage('x');
    await vi.advanceTimersByTimeAsync(750);

    // First attempt failed with 429 — we're now in the Retry-After window.
    expect(store.saveStatus()).toBe('rate-limited');
    expect(api.putData).toHaveBeenCalledTimes(1);

    // Advance 1.9s → still waiting (Retry-After was 2s).
    await vi.advanceTimersByTimeAsync(1900);
    expect(api.putData).toHaveBeenCalledTimes(1);

    // The full 2s → retry fires and succeeds.
    await vi.advanceTimersByTimeAsync(100);
    await vi.runAllTimersAsync();
    expect(api.putData).toHaveBeenCalledTimes(2);
    expect(store.saveStatus()).toBe('saved');
  });

  it('re-registers and retries on 401 mid-save', async () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    const api = makeMockApi();
    api.putData
      .mockRejectedValueOnce(httpError(401))
      .mockResolvedValueOnce(undefined);
    const store = configure(api);
    await store.init();

    store.addPage('x');
    await vi.advanceTimersByTimeAsync(750);
    await vi.runAllTimersAsync();

    expect(api.register).toHaveBeenCalledTimes(1);
    expect(api.putData).toHaveBeenCalledTimes(2);
    expect(store.saveStatus()).toBe('saved');
  });

  // ── switchToken ───────────────────────────────────────────────────────────

  it('switchToken cancels pending writes and does not flush old tree to new account', async () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    const api = makeMockApi();
    const store = configure(api);
    await store.init();

    // Mutate, then switch BEFORE the debounce fires.
    store.addPage('old-account');
    api.getData.mockResolvedValue({ pages: [] });
    store.switchToken(OTHER_TOKEN);

    // Run all timers — the OLD debounce must have been cancelled,
    // so no PUT should have happened.
    await vi.advanceTimersByTimeAsync(2000);
    expect(api.putData).not.toHaveBeenCalled();
    expect(store.token()).toBe(OTHER_TOKEN);
  });

  it('switchToken invalidates an init already in flight', async () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    const api = makeMockApi();
    let resolveFirstGet: ((v: TreeDto) => void) | null = null;
    api.getData
      .mockReturnValueOnce(new Promise<TreeDto>((res) => (resolveFirstGet = res)))
      .mockResolvedValueOnce({ pages: [mkPage('new-account')] });
    const store = configure(api);

    const firstInit = store.init();
    store.switchToken(OTHER_TOKEN);
    resolveFirstGet!({ pages: [mkPage('old-account')] });
    await firstInit;

    expect(api.getData).toHaveBeenCalledWith(OTHER_TOKEN);
    expect(store.token()).toBe(OTHER_TOKEN);
    expect(store.pages()[0].name).toBe('new-account');
  });

  it('switchToken cancels a pending retry without wedging future saves', async () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    const api = makeMockApi();
    api.putData
      .mockRejectedValueOnce(httpError(429, { 'Retry-After': '30' }))
      .mockResolvedValue(undefined);
    const store = configure(api);
    await store.init();

    store.addPage('old-account');
    await vi.advanceTimersByTimeAsync(750);
    expect(api.putData).toHaveBeenCalledTimes(1);

    api.getData.mockResolvedValue({ pages: [] });
    store.switchToken(OTHER_TOKEN);
    await vi.advanceTimersByTimeAsync(0);

    store.addPage('new-account');
    await vi.advanceTimersByTimeAsync(750);

    expect(api.putData).toHaveBeenCalledTimes(2);
    expect(api.putData.mock.calls[1][0]).toBe(OTHER_TOKEN);
    expect((api.putData.mock.calls[1][1] as TreeDto).pages[0].name).toBe('new-account');
  });

  it('does not load another account cache after switching tokens', async () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    storage[CACHE_KEY] = JSON.stringify({ pages: [mkPage('old-cache')] } satisfies TreeDto);
    const api = makeMockApi();
    const store = configure(api);
    await store.init();

    api.getData.mockRejectedValue(httpError(0));
    store.switchToken(OTHER_TOKEN);
    await vi.advanceTimersByTimeAsync(0);

    expect(storage[OTHER_CACHE_KEY]).toBeUndefined();
    expect(store.pages()).toHaveLength(0);
  });

  it('switchToken rejects a non-UUIDv4 input', () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    const api = makeMockApi();
    const store = configure(api);

    store.switchToken('not-a-uuid');
    expect(store.token()).toBe(''); // never initialized
  });

  it('switchToken canonicalizes uppercase UUID input', async () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    const api = makeMockApi();
    const store = configure(api);
    await store.init();

    store.switchToken(OTHER_TOKEN.toUpperCase());
    await vi.advanceTimersByTimeAsync(0);

    expect(store.token()).toBe(OTHER_TOKEN);
    expect(storage[TOKEN_KEY]).toBe(OTHER_TOKEN);
  });

  // ── Cross-tab sync ────────────────────────────────────────────────────────

  it('adopts a fresh cache written by another tab via the storage event', async () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    const api = makeMockApi();
    const store = configure(api);
    await store.init();
    expect(store.pages()).toHaveLength(0);

    const otherTabTree = { pages: [mkPage('from-other-tab')] };
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: CACHE_KEY,
        newValue: JSON.stringify(otherTabTree),
      }),
    );

    expect(store.pages()).toHaveLength(1);
    expect(store.pages()[0].name).toBe('from-other-tab');
  });
});
