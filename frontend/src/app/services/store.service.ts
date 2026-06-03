import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { ApiService } from './api.service';
import { AnalyticsService } from './analytics.service';
import { Page, Tower, Block, TreeDto, SaveStatus, HslColor } from '../models';

const TOKEN_KEY = 'life-towers.token.v4';
const CACHE_KEY_PREFIX = 'life-towers.cache.v4';
const PENDING_CACHE_KEY_PREFIX = 'life-towers.cache-pending.v4';
const DEBOUNCE_MS = 750;
const MAX_RETRIES = 5;

// RFC 4122 v4 UUID. Prefers crypto.randomUUID (secure contexts only) and
// falls back to crypto.getRandomValues — which works on plain http origins
// behind a non-localhost reverse proxy too.
function uuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      /* fall through */
    }
  }
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function isUuidV4(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    value.toLowerCase(),
  );
}

// localStorage can throw (private mode, quota exceeded, disabled). All
// access goes through these helpers so a transient failure never bubbles
// up and breaks app init.
function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}
function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function cacheKeyForToken(token: string): string {
  return `${CACHE_KEY_PREFIX}.${token}`;
}

function pendingCacheKeyForToken(token: string): string {
  return `${PENDING_CACHE_KEY_PREFIX}.${token}`;
}

interface PendingPut {
  token: string;
  tree: TreeDto;
  revision: number;
}

interface ExampleBlockSeed {
  tag: string;
  desc: string;
  done: boolean;
  difficulty?: number;
  ageHrs: number;
}

interface ExampleDonePattern {
  tag: string;
  desc: (sequence: number) => string;
}

const EXAMPLE_DONE_BLOCKS_PER_TOWER = 12;

@Injectable({ providedIn: 'root' })
export class StoreService implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly analytics = inject(AnalyticsService);

  // ── State ──────────────────────────────────────────────────────────────────
  private readonly _pages = signal<Page[]>([]);
  private readonly _saveStatus = signal<SaveStatus>('idle');
  private readonly _token = signal<string>('');
  private readonly _loading = signal<boolean>(true);

  readonly pages = this._pages.asReadonly();
  readonly saveStatus = this._saveStatus.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly token = this._token.asReadonly();

  // ── Debounce / retry ───────────────────────────────────────────────────────
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryResolver: (() => void) | null = null;
  private flushInFlight = false;
  // True while in-flight if a new mutation arrived; we'll re-flush after.
  private dirtyDuringFlush = false;
  // Monotonic local mutation version. Prevents an older in-flight PUT from
  // clearing a newer pending cache entry when it completes.
  private localMutationRevision = 0;

  // ── Cross-tab sync ─────────────────────────────────────────────────────────
  private readonly storageListener = (e: StorageEvent) => {
    if (e.key === TOKEN_KEY && e.newValue && e.newValue !== this._token()) {
      this.switchToken(e.newValue);
    } else if (e.key === cacheKeyForToken(this._token()) && e.newValue && !this.flushInFlight) {
      // Another tab just wrote a fresh cache; adopt it if we're not mid-save
      // (to avoid clobbering our own state with the other tab's older view).
      try {
        const tree: TreeDto = JSON.parse(e.newValue);
        this._pages.set(tree.pages);
      } catch {
        /* ignore */
      }
    }
  };

  // ── Single-flight init ─────────────────────────────────────────────────────
  private initPromise: Promise<void> | null = null;
  private initGeneration = 0;

  // ── Init ───────────────────────────────────────────────────────────────────
  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    const generation = ++this.initGeneration;
    this.initPromise = this.doInit(generation).finally(() => {
      if (this.initGeneration === generation) {
        this.initPromise = null;
      }
    });
    return this.initPromise;
  }

  private async doInit(generation: number): Promise<void> {
    if (typeof window !== 'undefined') {
      // (idempotent — adding the same listener twice is a no-op)
      window.addEventListener('storage', this.storageListener);
    }

    let stored = safeGet(TOKEN_KEY);
    if (stored && !isUuidV4(stored)) {
      // Garbage in localStorage from a buggy past version — refuse it.
      stored = null;
    } else if (stored) {
      stored = stored.toLowerCase();
      safeSet(TOKEN_KEY, stored);
    }
    const token = stored ?? uuidV4();
    if (!stored) {
      safeSet(TOKEN_KEY, token);
    }
    this._token.set(token);

    if (!stored) {
      try {
        await this.api.register(token);
      } catch {
        // Non-fatal; the 401 path below will re-attempt registration.
      }
    }

    try {
      const tree = await this.api.getData(token);
      if (this.isCurrentInit(generation, token)) this.adoptServerTree(tree, token);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 401) {
        // Token unknown to server — re-register (idempotent) and retry.
        try {
          await this.api.register(token);
          const tree = await this.api.getData(token);
          if (this.isCurrentInit(generation, token)) this.adoptServerTree(tree, token);
        } catch {
          if (this.isCurrentInit(generation, token)) this.loadFromCache(token);
        }
      } else {
        if (this.isCurrentInit(generation, token)) this.loadFromCache(token);
      }
    } finally {
      if (this.initGeneration === generation) {
        this._loading.set(false);
      }
    }
  }

  private isCurrentInit(generation: number, token: string): boolean {
    return this.initGeneration === generation && this._token() === token;
  }

  /**
   * Apply a freshly-fetched server tree. If the server is empty but our local
   * cache holds data, the cache wins and we schedule a push — otherwise the
   * "server forgot me" recovery would silently wipe offline edits.
   */
  private adoptServerTree(tree: TreeDto, token: string): void {
    if (safeGet(pendingCacheKeyForToken(token))) {
      const cachedTree = this.readCachedTree(token);
      if (cachedTree?.pages && cachedTree.pages.length > 0) {
        this._pages.set(cachedTree.pages);
        this.scheduleSave();
        return;
      }
    }

    if (tree.pages.length === 0) {
      const cachedTree = this.readCachedTree(token);
      if (cachedTree?.pages && cachedTree.pages.length > 0) {
        this._pages.set(cachedTree.pages);
        this.scheduleSave();
        return;
      }
    }
    this._pages.set(tree.pages);
    this.updateCache(token, tree);
  }

  private loadFromCache(token: string): void {
    const tree = this.readCachedTree(token);
    if (tree) this._pages.set(tree.pages);
  }

  private readCachedTree(token: string): TreeDto | null {
    const raw = safeGet(cacheKeyForToken(token));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TreeDto;
    } catch {
      return null;
    }
  }

  private updateCache(token: string, tree: TreeDto, pending = false): void {
    safeSet(cacheKeyForToken(token), JSON.stringify(tree));
    if (pending) {
      safeSet(pendingCacheKeyForToken(token), '1');
    } else {
      safeRemove(pendingCacheKeyForToken(token));
    }
  }

  private cancelPendingWrites(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.retryResolver !== null) {
      const resolve = this.retryResolver;
      this.retryResolver = null;
      resolve();
    }
    this.dirtyDuringFlush = false;
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  addPage(name: string): void {
    const page: Page = {
      id: uuidV4(),
      name,
      hide_create_tower_button: false,
      keep_tasks_open: false,
      default_date_from: null,
      default_date_to: null,
      towers: [],
    };
    this._pages.update((pages) => [...pages, page]);
    this.analytics.trackStart();
    this.analytics.trackPageCreated();
    this.scheduleSave();
  }

  updatePage(id: string, patch: Partial<Omit<Page, 'id' | 'towers'>>): void {
    this._pages.update((pages) =>
      pages.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
    this.scheduleSave();
  }

  deletePage(id: string): void {
    this._pages.update((pages) => pages.filter((p) => p.id !== id));
    this.scheduleSave();
  }

  reorderPages(fromIndex: number, toIndex: number): void {
    let changed = false;
    this._pages.update((pages) => {
      const reordered = reorder(pages, fromIndex, toIndex);
      changed = reordered !== null;
      return reordered ?? pages;
    });
    if (changed) this.scheduleSave();
  }

  addTower(pageId: string, name: string, base_color: HslColor): string {
    const tower: Tower = { id: uuidV4(), name, base_color, blocks: [] };
    this._pages.update((pages) =>
      pages.map((p) => (p.id === pageId ? { ...p, towers: [...p.towers, tower] } : p)),
    );
    this.analytics.trackStart();
    this.analytics.trackTowerCreated();
    this.scheduleSave();
    return tower.id;
  }

  updateTower(pageId: string, towerId: string, patch: Partial<Omit<Tower, 'id' | 'blocks'>>): void {
    this._pages.update((pages) =>
      pages.map((p) =>
        p.id === pageId
          ? { ...p, towers: p.towers.map((t) => (t.id === towerId ? { ...t, ...patch } : t)) }
          : p,
      ),
    );
    this.scheduleSave();
  }

  deleteTower(pageId: string, towerId: string): void {
    this._pages.update((pages) =>
      pages.map((p) =>
        p.id === pageId ? { ...p, towers: p.towers.filter((t) => t.id !== towerId) } : p,
      ),
    );
    this.scheduleSave();
  }

  reorderTowers(pageId: string, fromIndex: number, toIndex: number): void {
    let changed = false;
    this._pages.update((pages) =>
      pages.map((p) => {
        if (p.id !== pageId) return p;
        const towers = reorder(p.towers, fromIndex, toIndex);
        if (towers === null) return p;
        changed = true;
        return { ...p, towers };
      }),
    );
    if (changed) this.scheduleSave();
  }

  addBlock(
    pageId: string,
    towerId: string,
    tag: string,
    description: string,
    is_done = false,
    difficulty = 1,
  ): void {
    const block: Block = {
      id: uuidV4(),
      tag,
      description,
      is_done,
      difficulty,
      created_at: Math.floor(Date.now() / 1000),
    };
    this._pages.update((pages) =>
      pages.map((p) =>
        p.id === pageId
          ? {
            ...p,
            towers: p.towers.map((t) =>
              t.id === towerId ? { ...t, blocks: [...t.blocks, block] } : t,
            ),
          }
          : p,
      ),
    );
    this.analytics.trackStart();
    this.analytics.trackBlockCreated({ isDone: is_done });
    this.scheduleSave();
  }

  updateBlock(
    pageId: string,
    towerId: string,
    blockId: string,
    patch: Partial<Omit<Block, 'id' | 'created_at'>>,
  ): void {
    let becameDone = false;
    this._pages.update((pages) =>
      pages.map((p) =>
        p.id === pageId
          ? {
            ...p,
            towers: p.towers.map((t) =>
              t.id === towerId
                ? (() => {
                  const result = this.patchBlockList(t.blocks, blockId, patch);
                  becameDone = result.becameDone;
                  return { ...t, blocks: result.blocks };
                })()
                : t,
            ),
          }
          : p,
      ),
    );
    if (becameDone) {
      this.analytics.trackStart();
      this.analytics.trackBlockCompleted();
    }
    this.scheduleSave();
  }

  deleteBlock(pageId: string, towerId: string, blockId: string): void {
    this._pages.update((pages) =>
      pages.map((p) =>
        p.id === pageId
          ? {
            ...p,
            towers: p.towers.map((t) =>
              t.id === towerId
                ? { ...t, blocks: t.blocks.filter((b) => b.id !== blockId) }
                : t,
            ),
          }
          : p,
      ),
    );
    this.scheduleSave();
  }

  private patchBlockList(
    blocks: Block[],
    blockId: string,
    patch: Partial<Omit<Block, 'id' | 'created_at'>>,
  ): { blocks: Block[]; becameDone: boolean } {
    const nextBlocks: Block[] = [];
    let completedBlock: Block | null = null;
    let becameDone = false;

    for (const block of blocks) {
      if (block.id !== blockId) {
        nextBlocks.push(block);
        continue;
      }

      const updated: Block = { ...block, ...patch };
      becameDone = !block.is_done && updated.is_done;
      if (becameDone) {
        // Display newly completed todos as the newest square, without changing
        // created_at because the date slider still filters on creation time.
        completedBlock = updated;
      } else {
        nextBlocks.push(updated);
      }
    }

    return {
      blocks: completedBlock ? [...nextBlocks, completedBlock] : nextBlocks,
      becameDone,
    };
  }

  /**
   * Switch to a different user's token. Any pending writes for the OLD
   * account must be cancelled first — otherwise a queued PUT could fire
   * against the NEW account with the old account's data (or vice versa,
   * if the timing flipped).
   */
  switchToken(newToken: string): void {
    const token = newToken.toLowerCase();
    if (!isUuidV4(token)) return;
    this.cancelPendingWrites();
    this.initGeneration++;
    this.initPromise = null;
    safeSet(TOKEN_KEY, token);
    this._token.set(token);
    this._pages.set([]);
    this._loading.set(true);
    this._saveStatus.set('idle');
    this.localMutationRevision = 0;
    void this.init();
  }

  // ── Save / sync ────────────────────────────────────────────────────────────

  private scheduleSave(): void {
    this.localMutationRevision += 1;
    const token = this._token();
    if (token) this.updateCache(token, { pages: this._pages() }, true);

    if (this.flushInFlight) {
      // A save is already happening. Mark dirty so we re-flush when it finishes.
      this.dirtyDuringFlush = true;
      return;
    }
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.runFlush();
    }, DEBOUNCE_MS);
  }

  /**
   * One save attempt with bounded retries. Captures the token and tree
   * snapshot up front so a mid-flight switchToken can't redirect this
   * write to a different account.
   */
  private async runFlush(): Promise<void> {
    if (this.flushInFlight) {
      this.dirtyDuringFlush = true;
      return;
    }
    const token = this._token();
    if (!token) return;

    this.flushInFlight = true;
    this.dirtyDuringFlush = false;
    const revision = this.localMutationRevision;

    // Cancel any pending retry — runFlush() supersedes it.
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    try {
      await this.attempt({ token, tree: { pages: this._pages() }, revision }, 0);
    } finally {
      this.flushInFlight = false;
      // Coalesce mutations that arrived during the flush into a fresh save.
      if (this.dirtyDuringFlush) {
        this.dirtyDuringFlush = false;
        this.scheduleSave();
      }
    }
  }

  private async attempt(put: PendingPut, attempt: number): Promise<void> {
    this._saveStatus.set(attempt === 0 ? 'saving' : 'retrying');
    try {
      await this.api.putData(put.token, put.tree);
      this._saveStatus.set('saved');
      if (
        this._token() === put.token &&
        put.revision === this.localMutationRevision &&
        !this.dirtyDuringFlush
      ) {
        this.updateCache(put.token, put.tree);
      }
      return;
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      const headers = (err as { headers?: { get(name: string): string | null } })?.headers;

      // Permanent failures: no point retrying.
      if (status === 400) {
        this._saveStatus.set('invalid');
        return;
      }
      if (status === 413) {
        this._saveStatus.set('too-large');
        return;
      }

      // 401 mid-PUT: server forgot us. Re-register (idempotent) and retry.
      if (status === 401) {
        try {
          await this.api.register(put.token);
        } catch {
          // fall through to retry/backoff
        }
      }

      if (attempt >= MAX_RETRIES) {
        this._saveStatus.set('error');
        return;
      }

      // Honor server's Retry-After when present (429 in particular).
      let delayMs = Math.min(1000 * 2 ** attempt, 30000);
      if (status === 429) {
        this._saveStatus.set('rate-limited');
        const ra = headers?.get('Retry-After') ?? headers?.get('retry-after');
        if (ra) {
          const seconds = parseInt(ra, 10);
          if (Number.isFinite(seconds) && seconds > 0) {
            delayMs = Math.min(seconds * 1000, 60_000);
          }
        }
      }

      await new Promise<void>((resolve) => {
        this.retryResolver = resolve;
        this.retryTimer = setTimeout(() => {
          this.retryTimer = null;
          this.retryResolver = null;
          resolve();
        }, delayMs);
      });

      // The token may have changed during the wait — re-check before retrying.
      if (this._token() !== put.token) return;
      // Re-snapshot the latest pages so the retry pushes current state.
      await this.attempt(
        { token: put.token, tree: { pages: this._pages() }, revision: put.revision },
        attempt + 1,
      );
    }
  }

  // ── Example data ──────────────────────────────────────────────────────────

  loadExample(): string {
    const now = Math.floor(Date.now() / 1000);

    const page: Page = {
      id: uuidV4(),
      name: 'Hobbies',
      hide_create_tower_button: false,
      keep_tasks_open: true,
      default_date_from: null,
      default_date_to: null,
      towers: [
        // Done blocks are listed oldest-first so they fill the falling stack
        // oldest → newest (left → right), matching the slider's old → new
        // labels; pending tasks stay on top for the accordion.
        this.makeExampleTower('Reading', { h: 0.05, s: 0.7, l: 0.55 }, now, [
          {
            tag: 'novel',
            desc: 'Finish The Brothers Karamazov',
            done: false,
            difficulty: 4,
            ageHrs: 0,
          },
          ...this.makeExampleDoneBlocks(
            [
              { tag: 'novel', desc: (n) => `Read chapter ${n}` },
              { tag: 'paper', desc: (n) => `Annotated paper ${n}` },
              { tag: 'article', desc: (n) => `Saved article notes ${n}` },
              { tag: 'essay', desc: (n) => `Drafted reading response ${n}` },
            ],
            2,
            8,
          ),
        ]),
        this.makeExampleTower('Side projects', { h: 0.58, s: 0.65, l: 0.5 }, now, [
          {
            tag: 'angular',
            desc: 'Modernise the towers app',
            done: false,
            difficulty: 3,
            ageHrs: 0,
          },
          {
            tag: 'rust',
            desc: 'Port the sync layer to Tauri',
            done: false,
            difficulty: 5,
            ageHrs: 1,
          },
          ...this.makeExampleDoneBlocks(
            [
              { tag: 'angular', desc: (n) => `Refined UI pass ${n}` },
              { tag: 'rust', desc: (n) => `Completed systems spike ${n}` },
              { tag: 'infra', desc: (n) => `Tuned deploy workflow ${n}` },
              { tag: 'docs', desc: (n) => `Captured project note ${n}` },
            ],
            4,
            9,
          ),
        ]),
        this.makeExampleTower('Exercise', { h: 0.36, s: 0.6, l: 0.5 }, now, [
          { tag: 'run', desc: '10k Sunday', done: false, difficulty: 2, ageHrs: 0 },
          { tag: 'climb', desc: 'Lead 6a outdoors', done: false, difficulty: 4, ageHrs: 4 },
          ...this.makeExampleDoneBlocks(
            [
              { tag: 'run', desc: (n) => `Easy run ${n}` },
              { tag: 'climb', desc: (n) => `Bouldering session ${n}` },
              { tag: 'mobility', desc: (n) => `Mobility circuit ${n}` },
              { tag: 'strength', desc: (n) => `Strength session ${n}` },
            ],
            6,
            11,
          ),
        ]),
      ],
    };

    this._pages.update((pages) => [...pages, page]);
    this.analytics.trackStart();
    this.analytics.trackExampleLoaded();
    this.scheduleSave();
    return page.id;
  }

  private makeExampleTower(
    name: string,
    base_color: HslColor,
    nowSec: number,
    blocks: ExampleBlockSeed[],
  ): Tower {
    return {
      id: uuidV4(),
      name,
      base_color,
      blocks: blocks.map((b) => ({
        id: uuidV4(),
        tag: b.tag,
        description: b.desc,
        is_done: b.done,
        difficulty: b.difficulty ?? 1,
        created_at: nowSec - Math.floor(b.ageHrs * 3600),
      })),
    };
  }

  private makeExampleDoneBlocks(
    patterns: ExampleDonePattern[],
    newestAgeHrs: number,
    spacingHrs: number,
  ): ExampleBlockSeed[] {
    return Array.from({ length: EXAMPLE_DONE_BLOCKS_PER_TOWER }, (_, i) => {
      const pattern = patterns[i % patterns.length];
      const sequence = Math.floor(i / patterns.length) + 1;
      return {
        tag: pattern.tag,
        desc: pattern.desc(sequence),
        done: true,
        difficulty: 1 + ((i + (i % patterns.length) * 2) % 5),
        ageHrs: newestAgeHrs + (EXAMPLE_DONE_BLOCKS_PER_TOWER - 1 - i) * spacingHrs,
      };
    });
  }

  ngOnDestroy(): void {
    this.cancelPendingWrites();
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageListener);
    }
  }
}

function reorder<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] | null {
  if (
    fromIndex === toIndex ||
    !Number.isInteger(fromIndex) ||
    !Number.isInteger(toIndex) ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return null;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}
