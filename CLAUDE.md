# Life Towers — agent notes

This file captures the load-bearing things to know about this codebase. Read it before making non-trivial changes.

## What this is

A personal-productivity TODO app where each user has multiple **pages**, each page holds several **towers** (vertical task columns), and each tower has **blocks** (atomic tasks). Pending blocks live in a **tasks accordion** at the top of the tower; completed ones fall into the tower as colored squares (the "falling animation" is the defining visual). Date-range slider filters which done blocks are visible.

This is a port/modernisation of a legacy Angular 7 app. **Design parity with the legacy is a hard requirement** — the user cares deeply about the original aesthetic. The legacy source lives at `_legacy_reference/` (gitignored) and is the source of truth for any visual question. A detailed style guide is at `docs/DESIGN.md`.

## Repo layout

```
backend/                 # FastAPI + SQLite (WAL)
  src/life_towers/
    main.py              # ASGI app, lifespan, static mount + SPA fallback
    api.py               # Routes (/api/v1/{health,register,data})
    auth.py              # Bearer UUIDv4 → user_id
    db.py                # sqlite3 factory + migration runner
    limits.py            # slowapi limiter + payload-size middleware
    models.py            # pydantic v2 schemas
    logging.py           # structlog JSON
    migrations/          # 001_initial.sql consolidated schema
  tests/test_api.py      # pytest + httpx AsyncClient
  pyproject.toml         # uv-managed
frontend/                # Angular 21+ standalone, signals, zoneless
  src/app/
    components/
      pages/             # Top-level: page selector + Settings button
      page/              # Tower row + slider + trash zone + confirm-delete
      tower/             # White tower card: tasks accordion + add-block + falling stack + name input
      block/             # Colored square (1/6 tower width)
      tasks/             # Pending-blocks accordion with tickbox
      welcome/           # Zero-state intro modal + "Try an example"
      modal/             # Generic backdrop shell + sub-modals (block-edit carousel, settings, tower-settings)
      shared/            # select-add, toggle, double-slider, color-picker, icon
    services/
      api.service.ts     # HttpClient wrapper, exact API contract
      store.service.ts   # signal-based store, debounced PUT, retry, loadExample
      modal-state.service.ts  # global open-modal counter (drag locking)
    models/index.ts      # Page / Tower / Block / HslColor TS interfaces
    utils/{color,hash}.ts
  library/               # Legacy SCSS dropped in verbatim — DO NOT REFACTOR
  public/assets/         # SVG icons (arrow, pen, plus-sign, trash, x-sign)
  src/assets/fonts/      # Self-hosted woff2 (Open Sans Condensed, Raleway, …)
  e2e/                   # Playwright (smoke + visuals)
docs/
  api-spec.md            # Single source of truth for the HTTP API contract
  DESIGN.md              # Legacy visual spec (verbatim SCSS quotes)
_legacy_reference/       # Original Angular 7 source — read-only, gitignored
Dockerfile               # Multi-stage: node:22-alpine build → python:3.13-slim runtime
docker-compose.yml       # Production single-container
docker-compose.dev.yml   # Ephemeral volume for Playwright runs
.forgejo/workflows/      # CI + deploy
```

## Tech stack quickrefs

- **Frontend**: Angular 21+, **standalone components** (no NgModule), `signal()` / `computed()` / `effect()` / `linkedSignal()`, **zoneless change detection** (`provideZonelessChangeDetection`), `@if`/`@for` control flow, **OnPush** everywhere, esbuild builder (`@angular/build:application`), Reactive Forms, Angular Service Worker (PWA), Angular CDK (drag-drop, A11yModule for focus trap)
- **Backend**: FastAPI, pydantic v2, slowapi (rate limiting), structlog, **sqlite3 with WAL + foreign_keys ON** every connection, uv-managed deps
- **Runtime topology**: single Docker container — FastAPI process serves both `/api/v1/*` JSON endpoints AND the built Angular SPA as static files with SPA fallback. Behind nginx; uvicorn launched with `--proxy-headers --forwarded-allow-ips=*`. **Deployed under a sub-path** (`https://schmelczer.dev/towers/`) — see "Sub-path deployment" below
- **Storage**: SQLite at `/data/life-towers.db` on a named Docker volume. Tree-replace semantics (PUT replaces user's full tree atomically inside `BEGIN IMMEDIATE`)

## Sub-path deployment

The app is deployed under a path: `https://schmelczer.dev/towers/`. The mechanism, and the one rule that keeps it working:

- **SPA**: built with `ng build --base-href /towers/` (wired via the `BASE_HREF` Docker build arg; default `/`, set to `/towers/` in `.forgejo/workflows/docker.yml`). This stamps `<base href="/towers/">` into `index.html` and prefixes every URL in the service-worker manifest (`ngsw.json`). Asset and script `src`s stay relative, so they resolve against `<base>`.
- **API calls are relative** (`api/v1/...`, no leading slash — see `api.service.ts`) so they resolve against `<base>`: `/towers/api/v1/...` in prod, `/api/v1/...` at the root for dev/e2e. **Never reintroduce a leading slash** — it pins calls to the origin root and breaks the sub-path deploy.
- **Backend is path-agnostic** — it still serves the API at `/api/v1/*` and the SPA at the container root. **nginx strips the prefix** before proxying, so the backend never sees `/towers`. Because of that strip, the backend can't infer its public URL, so `LIFE_TOWERS_PUBLIC_URL` (set in `docker-compose.yml`) is what makes the server-rendered canonical / OG / Twitter tags correct (`main.py:_absolute_meta_urls`).
- **Required nginx** (the trailing slash on `proxy_pass` is what strips `/towers/`):
  ```nginx
  location = /towers { return 308 /towers/; }   # add the trailing slash
  location /towers/ {
      proxy_pass http://127.0.0.1:8000/;        # trailing slash strips the prefix
      proxy_set_header Host $host;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
  ```
- **SSE (`/api/v1/events`) through nginx**: the endpoint sends `X-Accel-Buffering: no`, which nginx honors to disable response buffering for that stream — so the block above works without a dedicated location. The 20s server-side keepalive comment stays under nginx's default 60s `proxy_read_timeout`, so idle streams don't get culled. If you ever lower `proxy_read_timeout` below ~20s, add `proxy_buffering off;` + a larger read timeout on a `location /towers/api/v1/events`.
- **Dev/e2e stay at the root**: `docker-compose.dev.yml` builds with the default `BASE_HREF=/`, and Playwright hits `http://life-towers:8000/`. The relative API paths work identically there, so e2e exercises the same code.

## Build / dev / test / deploy

```bash
# Full local stack (ephemeral data)
docker compose -f docker-compose.dev.yml up --build -d        # http://localhost:8000
docker compose -f docker-compose.dev.yml down -v              # teardown

# Frontend dev (with backend proxied via proxy.conf.json)
cd frontend && npm start                                       # ng serve on :4200, /api → :8000
cd frontend && npm run build                                   # production bundle to dist/frontend/browser/
cd frontend && npm test                                        # vitest (--run already in the script)
cd frontend && npm run test:e2e                                # Playwright

# Backend dev
cd backend && uv sync
cd backend && uv run pytest -v
cd backend && uv run uvicorn life_towers.main:app --reload     # :8000

# E2E in the sandbox: host-to-container port forwarding is broken here.
# Run Playwright INSIDE a container on the docker network instead:
docker run --rm \
  --network life-towers_default \
  -v "$(pwd)/frontend:/work" -w /work \
  -e PLAYWRIGHT_BASE_URL=http://life-towers:8000 \
  mcr.microsoft.com/playwright:v1.60.0-noble \
  npx playwright test
```

## Design system — the legacy is the source of truth

`docs/DESIGN.md` is the comprehensive spec. Key tokens:

```scss
// _legacy_reference/frontend/src/library/common-variables.scss
$accent-color: #a2666f;          // rose
$text-color:   #5d576b;          // muted purple-grey (also iOS theme-color)
$light-color:  #ffffff;
$background-gradient:        linear-gradient(90deg, #fff9e07f 0, #ffd6d67f 100%);  // 50% alpha — modal backdrop
$background-gradient-opaque: linear-gradient(90deg, #fffcf0 0, #ffebeb 100%);      // body background
$shadow:        0 0 1.5px 1.5px rgba(0,0,0,0.1), 0 0 3px 2px rgba(0,0,0,0.05);
$shadow-border: 0 0 0 0.75px rgba(0,0,0,0.1);                                      // hairline
$normal-font: 'Open Sans Condensed', sans-serif;
$title-font:  'Raleway', serif;
$mobile-width: 520px;
```

Spacing tokens (`library/main.scss`):
```scss
:root {
  --large-padding: 30px;   // 20px on mobile
  --medium-padding: 15px;
  --small-padding: 10px;   // 7.5px on mobile
  --border-radius: 5px;    // 3px on mobile
}
```

Font sizes (`library/text.scss`): `--larger/large/medium/small-font-size` = `22/18/16/11` desktop, `20/16/14/10` mobile.

**Animation timings**:
- `$long-animation-time: 200ms` — opacity, hover transforms, modal entry
- `$short-animation-time: 100ms` — tighter transitions (red trash-highlight overlay)
- **Falling animation**: `transform 1.5s cubic-bezier(0.5, 0, 1, 0)` (gravity ease-in)
- **Modal opacity entry/exit**: `300ms`

## Architectural conventions to follow

### Components

- Every component is **standalone**, **OnPush**, with `signal()`-based local state. No NgModule.
- Templates use **`@if` / `@for` / `@switch`** — never `*ngIf`/`*ngFor`.
- Inline templates + inline styles in `@Component({ template: \`...\`, styles: \`...\` })` is the norm. Larger components use templateUrl + styleUrl (only `pages.component`, `page.component`).
- SCSS inside `styles:` template literal — **`//` comments are fine inside SCSS but watch for backticks**; `// `display: contents`` inside a template literal closes it early. Use `/* */` if you need to mention CSS strings in comments.
- Library files (`library/*.scss`) are dropped from the legacy verbatim. Don't refactor them. Components `@import '../../../library/main'` (or similar relative depth).

### State

- `StoreService` is the single source of truth (signal-based).
- Mutations update the signal immediately (**optimistic**) and call `scheduleSave()` which debounces 750ms and PUTs the full tree.
- Failure mode: exponential backoff up to 5 attempts (1s, 2s, 4s, 8s, 16s).
- LocalStorage cache key: `life-towers.cache.v4`. Token: `life-towers.token.v4`.
- `init()` flow: stored token? Use it. No token? Mint via `uuidV4()` → register → GET data. On 401: re-register the SAME token (idempotent server-side), never silently mint a fresh one (would orphan data).

### Reactivity caveats with zoneless

- Plain field mutations in event handlers (`(click)="x = true"`) still trigger CD because Angular's event manager marks the view dirty — even with zoneless. But any async mutation outside an Angular event (setTimeout, raw addEventListener, MutationObserver) **will not** trigger CD; use signals there.
- `effect()` running on `signal()` reads triggers re-runs; wrap writes in `untracked()` to avoid loops.
- For input-driven derived state that the user can also override (e.g. `tasks.expanded` seeded from `initiallyOpen` but also clickable), use either `linkedSignal` or `effect()` + a flag (the codebase uses the latter for `tasks.component`).

### Sync model

- **Tree-replace**: `PUT /api/v1/data` sends the entire user hierarchy atomically. Backend wraps in `BEGIN IMMEDIATE`, deletes existing pages (cascading to towers + blocks via FK), inserts new rows. `position` columns track ordering.
- **No granular endpoints** for individual entity CRUD. Keep it tree-replace.
- Spec is in `docs/api-spec.md`. Backend pydantic models match it. Frontend `models/index.ts` matches it. Field names are **snake_case** on both sides.

### Multi-client sync (revision + CAS + SSE)

Multiple clients can share one token (same user on phone + laptop). Three pieces keep them in step — see `backend/src/life_towers/events.py`, `api.py`, and `frontend/src/app/{services,utils}`:

- **Per-user `revision`** (`users.revision`, migration `002_revision.sql`): a monotonic counter bumped inside the same `BEGIN IMMEDIATE` as every PUT. `GET /data` returns it; `PUT /data` returns the new one (`{ "revision": N }`, status 200 — **not** 204 anymore).
- **Compare-and-swap**: the client sends its base revision as the `If-Match` header on PUT. If the stored revision moved underneath it, the server rolls back and returns **409** with `{ "error": "conflict", "revision": <current> }`. Absent `If-Match` ⇒ unguarded write (keeps older cached clients working across a deploy). On 409 the store resolves **server-wins**: it refetches the current server tree and adopts it, discarding this device's un-pushed edit (`store.service.adoptServerData`). The CAS still prevents a stale write from clobbering the other device's data; there is deliberately **no client-side merge** — a conflicting in-flight edit on the losing device is dropped, which is acceptable for a single user across a few devices. (An earlier `utils/sync-merge.ts` 3-way merge was removed in favour of this simpler policy.)
- **SSE push** (`GET /api/v1/events`, `text/event-stream`): an in-process asyncio pub/sub (`events.py`, single worker — see Dockerfile) pushes the new revision to every live connection right after a PUT commits. The client consumes it with **fetch()+ReadableStream**, not `EventSource`, so the Bearer token rides in a header instead of the URL (`api.service.openEventStream` + `utils/sse.ts` parser). On a newer-revision event the store refetches **only when clean**; if it has pending edits it lets the next PUT's CAS resolve it (server-wins). The stream auto-reconnects with backoff; `switchToken`/`ngOnDestroy` tear it down.
- **Gotcha**: Starlette's `BaseHTTPMiddleware` is fine with streaming responses, but **httpx's in-memory `ASGITransport` is not** — it can't open a long-lived stream with concurrent requests, so SSE wire behaviour is verified against real uvicorn, not in pytest. Pytest covers the pub/sub bus + that a PUT publishes onto it; `tests/test_api.py` has the pattern.

### Backend

- All endpoints are inside `APIRouter(prefix="/api/v1")`. Spec drives behavior — if you change a limit, update both spec and code.
- Migrations: package data under `src/life_towers/migrations/`, loaded via `importlib.resources.files("life_towers").joinpath("migrations")`. The runner tracks applied state in a `schema_migrations(filename TEXT PRIMARY KEY, applied_at INTEGER)` table.
- All sqlite connections must do `PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000`. The `get_connection()` factory does this.
- Errors → JSON `{"error": code, "detail": str}` via a single `HTTPException` handler in `main.py`. Stack traces never leak (logged server-side).
- Rate limits via slowapi: `/register` 30/hour/IP, `GET /data` 60/min/token, `PUT /data` 30/min/token. `GET /events` (SSE) is intentionally **un**-limited — it's one long-lived connection per client.

## Visual + interaction details that bit me

### Falling animation (tower.component)

The `.block-container` has `transform: scaleY(-1)` so blocks visually fall from the TOP into the bottom of the tower. Each block default-positions at `translateY(500%)` via a `*` rule; the inline `[style.transform]="b._transform"` binding overrides per-block.

`reconcile()` renders done blocks at their **resting** position, then decides what should fall via the pure, unit-tested `decideFalls()` helper. Two guarantees:
- **No fall on page load.** A `hasRenderedStack` flag gates the very first render of a tower's stack: it never animates (blocks just appear at rest). Only the deliberate "Try an example" showcase (`animateInitialStack`) falls its whole initial stack. Do NOT key "first render" off effect-run ordering vs `ngAfterViewInit` measurement — that was non-deterministic and caused intermittent load-falls.
- **Always fall on add / tick.** After the first render, any done-block id that's genuinely new this round (set-difference vs `prevDoneIds`) and is currently resting & visible falls.

The fall itself is played **imperatively via the Web Animations API** (`playFall`): the block is already rendered at rest, and WAAPI animates it in from `translateY(500%)`/`opacity:0` on the next frame (`fill: 'backwards'` so it never flashes at rest first). This is deterministic — the old approach snapped the block to `500%` then flipped it back with a `.descend` CSS transition across a double-`requestAnimationFrame`, which raced zoneless change detection and would intermittently drop the fall (block just appears) or misfire on load. **WAAPI is the right tool for block animations here precisely because it's immune to CD timing.**

The **date range** slider asymmetry: blocks below `range.from` are removed from `visibleBlocks` entirely (instant shuffle, no gap), blocks above `range.to` get `_anim: 'ascend'` and stay in the list flying up. The `.descend` CSS class survives **only** for the reverse case — an already-rendered block re-entering range as the slider widens glides back down (a real in-DOM transform change, so CSS transitions reliably; no WAAPI needed). `prevDoneIds` tracks the full `allDone` id set — not the filtered styled list — so range reshuffles keep the same ids and never mis-fire as "new block".

### Block-edit carousel (modal/block-edit.component)

- Lives at `position: fixed; z-index: 10001` to escape the modal dialog wrapper and cover the viewport
- Two placeholder cards flank the real cards so the active card can fully center via `scroll-snap-align: center`
- `.mask` overlay on non-active cards has three tiers: `active opacity 0`, `near-active 0.55`, default `1`. Card opacity also tiered (1 / 0.85 / 0.6) mimicking the legacy `1.33*(1-t/2)` curve
- Backdrop click (anywhere not a non-placeholder card) closes the modal
- Delete on an existing card **does not** close the modal — it stays open and the card re-renders out of the list
- Auto-save on tag/toggle change; description deferred to blur

### Select-add (shared/select-add)

- Has a `.top` chip and a `.bottom` slide-down panel. `:has(.bottom.open) .top, .background { border-radius: var(--border-radius) var(--border-radius) 0 0 }` squares the bottom corners when open so the chip and panel read as one card
- Shadow seam between chip + panel solved with `clip-path: inset(...)`: `.background.active` clips bottom (`inset(-6px -6px 0 -6px)`), `.bottom.open` clips top (`inset(0 -6px -6px -6px)`). 6px > the total $shadow spread (5px) so neither edge bleeds across the seam
- Closing animation requires a two-transition setup: default state has `transition: ... visibility 0s $long-animation-time` (visibility delays on close), `.open` overrides with `visibility 0s 0s` (instant on open)

### Modal shell (modal/modal.component)

- `:host { display: contents }` — critical. Without this, the `lt-modal` host element takes a flex slot in `pages.component`'s `inner-spacing` layout, pushing the Settings button up when the modal mounts
- `section.modal` is `position: fixed; z-index: 10000` with `transition: opacity 300ms`. The component flips `active = true` in `ngAfterViewInit` via `setTimeout(0)` so the opacity 0 → 1 transition runs
- `ModalStateService.open()` / `.close()` are called in `AfterViewInit`/`OnDestroy`. `page.component` reads `modalState.anyOpen` and binds it to every tower's `[cdkDragDisabled]` so users can't drag towers behind an open modal

### Carousel card date format

```ts
formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });  // "May 28, 2026, 14:32"
}
```

### Double-slider relative-time labels

`page.component.ts` formats with `Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' })`. Buckets: `<45s` second, `<45min` minute, `<22h` hour, `<26d` day, `<320d` month, else year. Labels are **deduped** by string (multiple distinct timestamps that round to the same "5 hr ago" appear once).

When `values.length` grows (new block added), the slider snaps the **higher** of `oneValue`/`otherValue` to `MAX - 1` so the newest entry is always visible; the lower thumb (the user's left edge) stays put.

### Color picker (shared/color-picker)

- Row of 12 preset color swatches + a rainbow hue slider + a big preview swatch
- Saturation and lightness are FIXED at 0.7 / 0.55. Only hue varies
- Preset hues `[0, 15, 30, 45, 195, 215, 235, 255, 280, 310, 335, 355]` — skips the green/yellow zone (60°–180°) which muddies with the rose accent palette

### Tickbox (tasks/tasks.component)

- `✓` glyph is hidden at rest (`opacity: 0`) and only revealed on interaction: `0.85` (hover/focus-visible), `1` (active). It fades via the `opacity` transition
- The tickbox is a `<button>`, so the global animated-underline bar from `forms.scss` (`button:after { content:''; height: 2px; width: 0→100% on hover; background-color: $text-color }`) applies to it. `all: unset` strips the button's own styling but does NOT reach the pseudo-element — so `.tickbox::after` MUST re-assert `width: 100%; height: 100%; background: none`, otherwise on hover a dark `$text-color` bar paints across the top AND the box collapses to 2px (pinned at `top:0`), which centers the glyph near the top
- `font: bold 18px/1 $normal-font` is re-asserted on `::after` because `all: unset` drops the font to serif (Times New Roman)
- `transform: translateY(1px)` nudges the `✓` to optical centre (it sits a touch high in its em-box); `:active` must re-state the translateY or the glyph jumps when pressed
- `.all-task` is `overflow: hidden` (NOT a scroller) and animates to `#all.scrollHeight`; tall lists scroll in the outer `.container` (`overflow-y: auto; max-height: 30vh`). Making `.all-task` itself `overflow-y: auto` pops a scrollbar the moment the tickbox `scale(1.05)`s on hover (transforms widen the scrollable-overflow box)

### Mobile responsive

- `$mobile-width: 520px` is the single breakpoint
- Tower row: on mobile, `width: calc(66vw - var(--medium-padding)) !important` per tower with `overflow-x: auto` + `scroll-snap-type: x mandatory`. About 1.5 columns visible by default
- Carousel cards: `width: 85vw`, placeholders `7.5vw`, carousel `padding: 0 7.5vw` → snap-center lines up perfectly
- Modal cards (settings/tower-settings/welcome/confirm-delete): `width: 88vw; padding: var(--medium-padding)` on mobile. Confirm-buttons stack vertically with full width
- Block hover effect (`gravitate`) gated behind `@media (hover: hover) and (pointer: fine)` so touch devices don't get stuck scale-up
- Viewport meta blocks pinch-zoom: `<meta name="viewport" content="..., maximum-scale=1.0, user-scalable=no" />`
- `scrollbar-gutter: stable` + `overflow-y: scroll` on `html` so modal opens don't shift content sideways

### Tower drag-drop

- CDK drag-drop on `.towers cdkDropList[orientation=horizontal]`, each tower is `cdkDrag`
- Trash zone: `<img class="trash">` is OUTSIDE `.towers` (anchored to `page.component :host` at `bottom: 8px; left: 50%`). The legacy structure — moving it inside `.towers` breaks because it becomes a flex item
- Trash-highlight: `pointerenter` on trash → direct DOM `document.querySelector('.cdk-drag-preview').classList.add('trash-highlight')`. Matches legacy approach
- Drop over trash → opens a confirm modal (no immediate delete)

### Welcome modal + example data

- Shows when `!store.loading() && store.pages().length === 0`. Auto-dismisses when `pages().length > 0`
- "Try an example" calls `store.loadExample()` which creates a "Hobbies" page with three towers (Reading, Side projects, Exercise) at varied `created_at` ages so the slider has interesting labels

## Frontend sharp edges

- **`crypto.randomUUID()` requires a secure context** (HTTPS or localhost). On a plain-HTTP origin behind nginx, it throws and `init()` rejects, leaving `loading = true` forever. Always fall back to `crypto.getRandomValues` (`uuidV4()` helper in `store.service.ts`)
- **Angular 17+ deprecated `fileReplacements`** for env-per-build. Don't use `environment.ts` — use relative API paths everywhere + `proxy.conf.json` for ng serve
- **Angular 19+ `application` builder copies `public/`, NOT `src/assets/`**. SVG icons must live at `frontend/public/assets/` to be served at `/assets/foo.svg`. Fonts referenced via `url()` in styles.scss go through the CSS asset pipeline and emit to `/media/`
- **Backticks inside `styles:` template literal** close the string early — break TS parsing
- **Async iframe-like spawning of agents in this sandbox** (host port forwarding) doesn't work — run e2e via Playwright Docker image on the same `life-towers_default` network

## Backend sharp edges

- The 256 KiB payload cap is enforced by middleware reading `Content-Length`. Chunked encoding bypasses the check. Defense-in-depth would also stream `request.stream()`
- 10 MiB per-user quota is checked against the request body, NOT the existing user's stored total. With the 256 KiB request cap, the 10 MiB check is effectively unreachable. Documented spec gap
- The migrations directory was moved to `src/life_towers/migrations/` (inside the package) to ship as `importlib.resources` data — don't recreate `backend/migrations/`

## Visual e2e

- `frontend/e2e/visuals.spec.ts` is the source-of-truth for "what should this look like." It captures ~15 screenshots into `frontend/visuals/` (gitignored)
- Add a screenshot every time we land a visual change. Don't merge if it broke the visuals run
- Mobile screenshots use a separate test that spawns its own `browser.newContext({ viewport: { width: 390, height: 844 } })` — that's the iPhone 14 Pro viewport

## Conventions to enforce on changes

- Never use the legacy `frontend-legacy/` or `backend-legacy/` paths — those folders are GONE. `_legacy_reference/` is the reference, gitignored
- Never refactor `library/*.scss` — those files are dropped verbatim from the legacy and downstream components depend on their exports
- Never change the API contract in `docs/api-spec.md` without updating both pydantic models, api.py, frontend `models/index.ts`, and the backend tests in `tests/test_api.py`
- Never put modal-related elements as direct flex children of a layout container without `:host { display: contents }` on the modal — they'll add invisible flex slots
- Always run `npm run build` after a frontend change to catch TS/template errors that don't surface in the IDE
- Always run the visuals test after a visual change. Pull the screenshots, look at them, compare to the legacy

## Where to look next

- For the API contract: `docs/api-spec.md`
- For visual design questions: `docs/DESIGN.md` + `_legacy_reference/frontend/src/library/`
- For the sync flow: `frontend/src/app/services/store.service.ts` (the `init()`, `flush()`, `scheduleSave()` chain)
- For the falling animation: `frontend/src/app/components/tower/tower.component.ts:reconcile()`
- For drag-drop + trash: `frontend/src/app/components/page/page.component.{ts,html,scss}`
- For deploy: `Dockerfile`, `docker-compose.yml`, `.forgejo/workflows/`
