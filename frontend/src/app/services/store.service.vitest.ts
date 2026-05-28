import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { StoreService } from './store.service';
import { ApiService } from './api.service';
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
const CACHE_KEY = 'life-towers.cache.v4';

// ── Helpers ──────────────────────────────────────────────────────────────────
function configure(api: MockApi): StoreService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: ApiService, useValue: api },
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
    const newToken = 'aaaabbbb-cccc-4ddd-8eee-ffffffffffff';
    api.getData.mockResolvedValue({ pages: [] });
    store.switchToken(newToken);

    // Run all timers — the OLD debounce must have been cancelled,
    // so no PUT should have happened.
    await vi.advanceTimersByTimeAsync(2000);
    expect(api.putData).not.toHaveBeenCalled();
    expect(store.token()).toBe(newToken);
  });

  it('switchToken rejects a non-UUIDv4 input', () => {
    storage[TOKEN_KEY] = FIXED_UUID;
    const api = makeMockApi();
    const store = configure(api);

    store.switchToken('not-a-uuid');
    expect(store.token()).toBe(''); // never initialized
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
