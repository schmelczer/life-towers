import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { ApiService } from './api.service';
import { Page, Tower, Block, TreeDto, SaveStatus, HslColor } from '../models';

const TOKEN_KEY = 'life-towers.token.v4';
const CACHE_KEY = 'life-towers.cache.v4';
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
    value,
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

interface PendingPut {
  token: string;
  tree: TreeDto;
}

@Injectable({ providedIn: 'root' })
export class StoreService implements OnDestroy {
  private readonly api = inject(ApiService);

  // ── State ──────────────────────────────────────────────────────────────────
  private readonly _pages = signal<Page[]>([]);
  private readonly _saveStatus = signal<SaveStatus>('idle');
  private readonly _token = signal<string>('');
  private readonly _loading = signal<boolean>(true);

  readonly pages = this._pages.asReadonly();
  readonly saveStatus = this._saveStatus.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly token = this._token.asReadonly();

  readonly pageCount = computed(() => this._pages().length);

  // ── Debounce / retry ───────────────────────────────────────────────────────
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private flushInFlight = false;
  // True while in-flight if a new mutation arrived; we'll re-flush after.
  private dirtyDuringFlush = false;

  // ── Cross-tab sync ─────────────────────────────────────────────────────────
  private readonly storageListener = (e: StorageEvent) => {
    if (e.key === TOKEN_KEY && e.newValue && e.newValue !== this._token()) {
      // Another tab switched accounts. Re-init with the new token instead of
      // continuing to sync the old account's state to the new one.
      this._token.set(e.newValue);
      this._pages.set([]);
      this._loading.set(true);
      this.cancelPendingWrites();
      void this.init();
    } else if (e.key === CACHE_KEY && e.newValue && !this.flushInFlight) {
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

  // ── Init ───────────────────────────────────────────────────────────────────
  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInit().finally(() => {
      this.initPromise = null;
    });
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    if (typeof window !== 'undefined') {
      // (idempotent — adding the same listener twice is a no-op)
      window.addEventListener('storage', this.storageListener);
    }

    let stored = safeGet(TOKEN_KEY);
    if (stored && !isUuidV4(stored)) {
      // Garbage in localStorage from a buggy past version — refuse it.
      stored = null;
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
      this.adoptServerTree(tree);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 401) {
        // Token unknown to server — re-register (idempotent) and retry.
        try {
          await this.api.register(token);
          const tree = await this.api.getData(token);
          this.adoptServerTree(tree);
        } catch {
          this.loadFromCache();
        }
      } else {
        this.loadFromCache();
      }
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Apply a freshly-fetched server tree. If the server is empty but our local
   * cache holds data, the cache wins and we schedule a push — otherwise the
   * "server forgot me" recovery would silently wipe offline edits.
   */
  private adoptServerTree(tree: TreeDto): void {
    if (tree.pages.length === 0) {
      const cached = safeGet(CACHE_KEY);
      if (cached) {
        try {
          const cachedTree: TreeDto = JSON.parse(cached);
          if (cachedTree.pages && cachedTree.pages.length > 0) {
            this._pages.set(cachedTree.pages);
            this.scheduleSave();
            return;
          }
        } catch {
          /* fall through to server-empty */
        }
      }
    }
    this._pages.set(tree.pages);
    this.updateCache(tree);
  }

  private loadFromCache(): void {
    const raw = safeGet(CACHE_KEY);
    if (raw) {
      try {
        const tree: TreeDto = JSON.parse(raw);
        this._pages.set(tree.pages);
      } catch {
        /* ignore */
      }
    }
  }

  private updateCache(tree: TreeDto): void {
    safeSet(CACHE_KEY, JSON.stringify(tree));
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
    this._pages.update((pages) => {
      const arr = [...pages];
      const [item] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, item);
      return arr;
    });
    this.scheduleSave();
  }

  addTower(pageId: string, name: string, base_color: HslColor): void {
    const tower: Tower = { id: uuidV4(), name, base_color, blocks: [] };
    this._pages.update((pages) =>
      pages.map((p) => (p.id === pageId ? { ...p, towers: [...p.towers, tower] } : p)),
    );
    this.scheduleSave();
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
    this._pages.update((pages) =>
      pages.map((p) => {
        if (p.id !== pageId) return p;
        const towers = [...p.towers];
        const [item] = towers.splice(fromIndex, 1);
        towers.splice(toIndex, 0, item);
        return { ...p, towers };
      }),
    );
    this.scheduleSave();
  }

  addBlock(
    pageId: string,
    towerId: string,
    tag: string,
    description: string,
    is_done = false,
  ): void {
    const block: Block = {
      id: uuidV4(),
      tag,
      description,
      is_done,
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
    this.scheduleSave();
  }

  updateBlock(
    pageId: string,
    towerId: string,
    blockId: string,
    patch: Partial<Omit<Block, 'id' | 'created_at'>>,
  ): void {
    this._pages.update((pages) =>
      pages.map((p) =>
        p.id === pageId
          ? {
              ...p,
              towers: p.towers.map((t) =>
                t.id === towerId
                  ? {
                      ...t,
                      blocks: t.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
                    }
                  : t,
              ),
            }
          : p,
      ),
    );
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

  toggleBlock(pageId: string, towerId: string, blockId: string): void {
    this._pages.update((pages) =>
      pages.map((p) =>
        p.id === pageId
          ? {
              ...p,
              towers: p.towers.map((t) =>
                t.id === towerId
                  ? {
                      ...t,
                      blocks: t.blocks.map((b) =>
                        b.id === blockId ? { ...b, is_done: !b.is_done } : b,
                      ),
                    }
                  : t,
              ),
            }
          : p,
      ),
    );
    this.scheduleSave();
  }

  /**
   * Switch to a different user's token. Any pending writes for the OLD
   * account must be cancelled first — otherwise a queued PUT could fire
   * against the NEW account with the old account's data (or vice versa,
   * if the timing flipped).
   */
  switchToken(newToken: string): void {
    if (!isUuidV4(newToken)) return;
    this.cancelPendingWrites();
    safeSet(TOKEN_KEY, newToken);
    this._token.set(newToken);
    this._pages.set([]);
    this._loading.set(true);
    this._saveStatus.set('idle');
    void this.init();
  }

  // ── Save / sync ────────────────────────────────────────────────────────────

  private scheduleSave(): void {
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

    // Cancel any pending retry — runFlush() supersedes it.
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    try {
      await this.attempt({ token, tree: { pages: this._pages() } }, 0);
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
      this.updateCache(put.tree);
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
        this.retryTimer = setTimeout(() => {
          this.retryTimer = null;
          resolve();
        }, delayMs);
      });

      // The token may have changed during the wait — re-check before retrying.
      if (this._token() !== put.token) return;
      // Re-snapshot the latest pages so the retry pushes current state.
      await this.attempt({ token: put.token, tree: { pages: this._pages() } }, attempt + 1);
    }
  }

  // ── Example data ──────────────────────────────────────────────────────────

  loadExample(): void {
    const now = Math.floor(Date.now() / 1000);

    const page: Page = {
      id: uuidV4(),
      name: 'Hobbies',
      hide_create_tower_button: false,
      keep_tasks_open: true,
      default_date_from: null,
      default_date_to: null,
      towers: [
        this.makeExampleTower('Reading', { h: 0.05, s: 0.7, l: 0.55 }, now, [
          { tag: 'novel',   desc: 'Finish The Brothers Karamazov',  done: false, ageHrs: 0 },
          { tag: 'novel',   desc: "Read Dostoyevsky's notes",       done: true,  ageHrs: 2 },
          { tag: 'article', desc: 'How does WebAssembly GC work?',  done: true,  ageHrs: 6 },
          { tag: 'paper',   desc: 'Re-read "Out of the Tar Pit"',   done: true,  ageHrs: 30 },
          { tag: 'novel',   desc: 'Submit a short story',           done: true,  ageHrs: 72 },
        ]),
        this.makeExampleTower('Side projects', { h: 0.58, s: 0.65, l: 0.5 }, now, [
          { tag: 'angular', desc: 'Modernise the towers app',       done: false, ageHrs: 0 },
          { tag: 'rust',    desc: 'Port the sync layer to Tauri',   done: false, ageHrs: 1 },
          { tag: 'angular', desc: 'Wire CDK drag-drop',             done: true,  ageHrs: 24 },
          { tag: 'rust',    desc: 'Spike SQLite vs LMDB',           done: true,  ageHrs: 96 },
        ]),
        this.makeExampleTower('Exercise', { h: 0.36, s: 0.6, l: 0.5 }, now, [
          { tag: 'run',    desc: '10k Sunday',          done: false, ageHrs: 0 },
          { tag: 'climb',  desc: 'Lead 6a outdoors',    done: false, ageHrs: 4 },
          { tag: 'climb',  desc: 'Bouldering session',  done: true,  ageHrs: 12 },
          { tag: 'run',    desc: 'Easy 5k loop',         done: true,  ageHrs: 48 },
          { tag: 'climb',  desc: 'Top-roped 5c',         done: true,  ageHrs: 96 },
        ]),
      ],
    };

    this._pages.update((pages) => [...pages, page]);
    this.scheduleSave();
  }

  private makeExampleTower(
    name: string,
    base_color: HslColor,
    nowSec: number,
    blocks: Array<{ tag: string; desc: string; done: boolean; ageHrs: number }>,
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
        created_at: nowSec - Math.floor(b.ageHrs * 3600),
      })),
    };
  }

  ngOnDestroy(): void {
    this.cancelPendingWrites();
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageListener);
    }
  }
}
