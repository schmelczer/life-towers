# DESIGN.md — Life Towers Legacy Visual Spec (Angular 7 → 21 port)

Forensic reference for restoring pixel-perfect parity. Every snippet is quoted verbatim from `_legacy_reference/frontend/src/`. File paths are absolute.

---

## 1. Color tokens

`_legacy_reference/frontend/src/library/common-variables.scss:1-9`:

```scss
$accent-color: #a2666f;
$text-color: #5d576b;
$light-color: #ffffff;

$background-gradient:        linear-gradient(90deg, #fff9e07f 0, #ffd6d67f 100%);
$background-gradient-opaque: linear-gradient(90deg, #fffcf0 0, #ffebeb 100%);

$shadow:        0 0 1.5px 1.5px rgba(0, 0, 0, 0.1), 0 0 3px 2px rgba(0, 0, 0, 0.05);
$shadow-border: 0 0 0 0.75px rgba(0, 0, 0, 0.1);
```

`index.html:14`: `<meta name="theme-color" content="#5d576b" />` — iOS/Android theme bar = `$text-color`.

- `7f` hex alpha in `$background-gradient` is ~50% opacity. Opaque variant is used on `<body>`; semi-transparent is the **modal backdrop**.
- `$shadow` is a layered "soft-glow border" — first ring 1.5px tight (10% black), second 3px diffuse (5% black). Reuse exactly.
- `$shadow-border` is a 0.75px hairline used in place of CSS `border:` everywhere.

---

## 2. Typography

Fonts loaded in `index.html:8-11, 17-18`:
```html
<link href="https://fonts.googleapis.com/css?family=Open+Sans+Condensed:300|Raleway&display=swap&subset=latin-ext" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500&display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
```

`common-variables.scss:11-12`:
```scss
$normal-font: 'Open Sans Condensed', sans-serif;
$title-font:  'Raleway', serif;
```

Only **Open Sans Condensed Light 300** and **Raleway 400** are actually used in the visual design.

`library/text.scss:3-58`:
```scss
:root {
  --larger-font-size: 22px;
  --large-font-size: 18px;
  --medium-font-size: 16px;
  --small-font-size: 11px;

  @media (max-width: $mobile-width) {        // 520px
    --larger-font-size: 20px;
    --large-font-size: 16px;
    --medium-font-size: 14px;
    --small-font-size: 10px;
  }
}

@mixin title-text     { font-family: $title-font;  color: $text-color; font-size: var(--larger-font-size); user-select: none; }
@mixin sub-title-text { font-family: $title-font;  color: $text-color; font-size: var(--medium-font-size); user-select: none; }
@mixin normal-text    { font-family: $normal-font; color: $text-color; font-size: var(--larger-font-size); }
@mixin medium-text    { font-family: $normal-font; color: $text-color; font-size: var(--medium-font-size); }
@mixin small-text     { font-family: $normal-font; color: $text-color; font-size: var(--small-font-size);  }

h1, h2, h3 { @include title-text(); }
p          { @include normal-text(); }
```

---

## 3. Spacing tokens

`library/main.scss:8-22`:
```scss
:root {
  --border-radius: 5px;
  --large-padding: 30px;
  --medium-padding: 15px;
  --small-padding: 10px;

  @media (max-width: $mobile-width) {  // 520px
    --border-radius: 3px;
    --large-padding: 20px;
    --medium-padding: 15px;
    --small-padding: 7.5px;
  }
}
```

Body padding is `var(--large-padding)` — 30px desktop / 20px mobile around everything.

Breakpoints:
```scss
$mobile-width: 520px;
$min-height:   400px;
```

---

## 4. Animations

`library/animations.scss:1-22` (full file):
```scss
@import 'common-variables';

$long-animation-time:  200ms;
$short-animation-time: 100ms;

@mixin gravitate {
  cursor: pointer;
  transition: box-shadow $long-animation-time, transform $long-animation-time;
  &:hover {
    box-shadow: $shadow;
    transform: scale(1.1);
  }
}

@mixin jump {
  cursor: pointer;
  transition: transform $long-animation-time;
  &:hover { transform: translateY(-2px); }
}
```

### 4a. The "falling animation" (THE critical interaction)

A block transitions from above the tower top (`translateY(500%)`) down into its slot. The `.block-container` is `transform: scaleY(-1)` (flipped). Visually each new block drops from the top of the tower and lands on top of the previous ones. The ease curve `cubic-bezier(0.5, 0, 1, 0)` is a steep accelerating ease-in (gravity).

`tower.component.scss:115-140`:
```scss
.block-container-container {
  position: relative;
  flex: 1;
  .block-container {
    display: flex;
    flex-flow: row wrap;
    justify-content: flex-start;
    align-content: flex-start;
    align-items: flex-end;
    position: absolute;
    bottom: 0;
    width: 100%;
    transform: scaleY(-1);

    * { transform: translateY(500%); }

    .descend {
      transition: transform 1.5s cubic-bezier(0.5, 0, 1, 0), opacity 500ms cubic-bezier(0.5, 0, 1, 0);
    }

    .ascend {
      transition: transform 1.5s cubic-bezier(0.5, 0, 1, 0), opacity 500ms cubic-bezier(0.5, 0, 1, 0) 1s;
    }
  }
}
```

Driver pattern (`tower.component.ts:67-98`):
```ts
const lastBlock = top(this.styledBlocks);
if (lastBlock) {
  lastBlock.style = { transform: 'translateY(500%)', opacity: '0' };
  setTimeout(() => {
    this.makeBlockDescend(lastBlock);
    this.changeDetection.markForCheck();
  }, 0);
}
...
makeBlockDescend(block) { block.cssClass = 'descend'; block.style = { transform: 'translateY(0)', opacity: '1' }; }
makeBlockAscend(block)  { block.cssClass = 'ascend';  block.style = { transform: 'translateY(500%)', opacity: '0' }; }
```

Sequence on add: place the new block at `translateY(500%)/opacity:0` synchronously, then on next tick apply `.descend` class + reset transform to `translateY(0)/opacity:1`. The 1.5s gravity cubic curve does the fall; opacity fades in over the first 500ms.

On ascend: same curve but the opacity delay is **1s** so the block stays visible for most of the upward flight, then fades just before leaving.

### 4b. Other timed transitions

- Modal backdrop opacity: `300ms`.
- Tower hover-shadow + scale: `gravitate()` mixin = 200ms.
- Tower drag-and-drop reflow: `transform 200ms cubic-bezier(0, 0, 0.2, 1)`.
- cdkDrag animating: `transform 250ms cubic-bezier(0, 0, 0.2, 1)`.
- Trash icon scale-in: `transform 200ms`.
- Toggle thumb slide: `box-shadow/left/transform 200ms`.
- Select-add dropdown: `transform 200ms translateY(-100%) → none`; background height 200ms.
- Button underline (`forms.scss:78`): `width 300ms`.
- Tasks accordion `.all-task`: `height 200ms`.

---

## 5. Mixins (verbatim, ready to port)

`library/utils.scss`:
```scss
@mixin inner-spacing($spacing, $horizontal: false) {
  & > *:not(:last-child) {
    @if $horizontal { margin-right: $spacing; }
    @else { margin-bottom: $spacing; }
  }
}
```

`library/spacing.scss` (despite filename, contains `square`):
```scss
@mixin square($size) {
  width: $size;
  height: $size;
}
```

`library/main.scss:24-43`:
```scss
@mixin card {
  border-radius: var(--border-radius);
  background-color: $light-color;
}

@mixin center-child {
  display: flex;
  justify-content: center;
  align-items: center;
}

@mixin exit {
  @include square(16px);
  background: url('/assets/x-sign.svg') no-repeat center center;
  background-size: 50% 50%;
  box-sizing: content-box;
  padding: 8px;
  @include jump();
}
```

`library/forms.scss:1-85` — global form styling:
```scss
@import 'text';
@import 'animations';

textarea {
  @include normal-text();
  &:disabled { background-color: $light-color; }
  display: block; width: 100%; height: 150px;
  @media (max-width: $mobile-width) { height: 100px; }
  resize: none; box-sizing: border-box; border: none;
}

input[type='text'] {
  @include sub-title-text();
  width: 100%; background: transparent; display: block; border: 0;
  &::placeholder { color: inherit; opacity: 0.6; }
  &:focus { box-shadow: 0 1px $text-color; }
}

button {
  -webkit-appearance: none;
  margin: 8px auto 0 auto;
  user-select: none;
  background: transparent;
  border: 0;
  @include medium-text();
  font-size: var(--large-font-size);
  $height: 2px;
  cursor: pointer;
  border-bottom: solid $height #5d576b55;
  position: relative;
  &:disabled {
    color: #5d576b55;
    border-bottom: solid $height #5d576b33;
    cursor: not-allowed;
  }
  &:not(:disabled):hover { &:after { width: 100%; } }
  &:after {
    content: '';
    width: 0; height: $height;
    position: absolute; left: 0;
    bottom: calc(-1 * #{$height});
    background-color: $text-color;
    transition: width 300ms;
  }
}

label { display: none; }
```

Global root + scrollbar (`styles.scss` + `main.scss:45-68`):
```scss
* { margin: 0; padding: 0;
  &:active, &:focus { outline: 0; }
  &::selection { background: $text-color; color: $light-color; }
  &::placeholder { user-select: none; }
}
html { height: 100%; background-color: $text-color; }
body { height: 100%; background: $background-gradient-opaque; text-align: center; padding: var(--large-padding); box-sizing: border-box; position: relative; }
*::-webkit-scrollbar       { width: 4px; height: 4px; }
*::-webkit-scrollbar-track { box-shadow: $shadow-border; border-radius: var(--border-radius); }
*::-webkit-scrollbar-thumb { background-color: $text-color; border-radius: var(--border-radius); cursor: pointer; }
* { -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
```

`$line-height: 2px;` is declared in `styles.scss:3` and reused by exit-pen underline, slider track, etc.

---

## 6. Layout rules per component

### 6a. Pages (top page selector) — `pages.component`

There is **no traditional tab strip**. The "page picker" is the `<app-select-add>` dropdown inside `.select-add-container` with `width: 250px; margin: auto`. It serves as both selector ("Add a new page…" placeholder) and editor (`editable=true` shows pen icon).

```scss
:host {
  height: 100%;
  display: flex; flex-direction: column; justify-content: space-between;
  @include inner-spacing(var(--large-padding));

  .select-add-container { width: 250px; margin: 0 auto; }
  .page-container { flex: 1 0 auto; }
  button {
    transition: opacity $long-animation-time;
    &.transparent { opacity: 0; }
  }
}
```

Settings button at bottom fades to opacity 0 while a tower is dragging.

### 6b. Page (towers container) — `page.component`

Magic geometry:
```scss
.towers {
  display: flex; justify-content: center;
  width: 100%; margin: 0 auto;
  flex: 1 0 auto;
  transition: box-shadow $short-animation-time;
  max-width: 800px;

  &.cdk-drop-list-dragging {
    *:not(.cdk-drag-placeholder) {
      transition: transform $long-animation-time cubic-bezier(0, 0, 0.2, 1);
    }
  }

  div { @include center-child();              // add-tower wrapper
    img.add-tower {
      height: 48px;
      @media (max-width: $mobile-width) { height: 32px; }
      opacity: 0.33;
      transition: opacity $long-animation-time;
      cursor: pointer;
      &:hover { opacity: 1; }
    }
  }

  & > * {
    max-width: 200px;
    box-sizing: content-box;
    flex: 0 0 auto;
    &:not(:nth-last-child(1)) {
      margin-right: var(--medium-padding);
      @media (max-width: $mobile-width) { margin-right: var(--small-padding); }
    }
  }
  position: relative;

  @for $i from 1 to 6 {
    & > *:first-child:nth-last-child(#{$i}),
    & > *:first-child:nth-last-child(#{$i}) ~ * {
      width: calc((100% - (#{$i} - 1) * var(--medium-padding)) / #{$i});
      @media (max-width: $mobile-width) {
        width: calc((100% - (#{$i} - 1) * var(--small-padding)) / #{$i});
      }
    }
  }
}
```

Max 5 towers per page. Each tower gets an equal column up to 200px wide.

Trash icon:
```scss
img.trash {
  @include square(48px);
  padding: 16px;
  position: absolute;
  z-index: 1500;
  bottom: 8px; left: 50%;
  margin: 0 !important;
  transform: translateX(-50%) scale(0);
  transition: transform $long-animation-time;
  &.active { transform: translateX(-50%) scale(1); }
  &:hover  { transform: translateX(-50%) scale(1.1); }
}
```

### 6c. Tower — `tower.component`

Tower header: the `<input type="text">` for the tower name (font: `var(--small-font-size)`, centered, width 50% desktop). Color = tower's `baseColor` HSL.

Card body:
```scss
.container {
  display: flex; flex-direction: column;
  flex: 1 1 auto;
  position: relative;
  @include card();
  overflow: hidden;
  transition: transform $short-animation-time, box-shadow $long-animation-time;
  @include inner-spacing(var(--medium-padding));
  width: 100%;

  :before {                              // red flash overlay during trash-highlight
    content: '';
    pointer-events: none;
    position: absolute; z-index: 2;
    left: 0; top: 0; width: 100%; height: 100%;
    background-color: red;
    opacity: 0;
    border-radius: var(--border-radius);
    transition: opacity $short-animation-time;
  }

  img {                                  // the plus-sign button inside the tower
    position: relative; z-index: 2;
    height: 48px;
    @media (max-width: $mobile-width) { height: 32px; }
    opacity: 0.33;
    transition: opacity $long-animation-time;
    cursor: pointer;
    &:hover { opacity: 1; }
  }
}
```

Hover shows `$shadow` above `$mobile-width`. `.trash-highlight` class shrinks to `scale(0.75)`, bumps `:before` to 0.5 opacity, hides the name input.

### 6d. Block — `block.component` ⭐ CRITICAL VISUAL DIVERGENCE

**A block is purely a colored square** — sized to 1/6th of the tower width. No tag label, no description, no done-state. The visual distinction is "it's IN THE TOWER" (done) vs "it's in the TASKS accordion" (pending).

```html
<div [ngStyle]="{ 'background-color': block.color | color }" (click)="handleClick()"></div>
```

```scss
:host {
  position: relative;
  width: calc(100% / 6);
  padding-bottom: calc(100% / 6);        // forces aspect-ratio 1:1
  div {
    position: absolute;
    width: 100%; height: 100%;
    @include gravitate();                // hover shadow + scale 1.1
  }
}
```

Per-block color (`model/tower.ts:52-54`):
```ts
getColorOfTag(tag: string): IColor {
  return lighten((hash(tag) - 0.5) * 50, this.baseColor);
}
```

```ts
// utils/color.ts
export const lighten = (by: number, { h, s, l }: IColor): IColor => {
  let newL = l + by;
  if (newL > 100) newL = 100;
  else if (newL < 0) newL = 0;
  return { h, s, l: newL };
};
```

Deterministic hash of tag → `[0,1)`, centered at 0.5 → `[-0.5, +0.5)`, scaled ×50 → `[-25, +25)` lightness offset added to tower's HSL. **All blocks in a tower vary in lightness only**, around the tower's baseColor.

### 6e. Tasks (pending blocks accordion) — `tasks.component` ⭐ MISSING IN NEW APP

Tasks is **not** a sub-modal — it's an in-tower accordion listing **pending** (not-done) blocks. Sits ABOVE the falling-blocks area, inside each tower.

```scss
:host {
  width: 100%; box-sizing: border-box;
  position: relative; z-index: 100000;

  .container {
    @include card();
    cursor: pointer;
    transition: box-shadow $long-animation-time;
    &.show-hover:hover { box-shadow: $shadow-border; }

    padding: calc(var(--small-padding) / 2);
    margin: calc(var(--small-padding) / 2);
    max-height: 30vh;
    overflow-y: auto;

    .header { cursor: pointer; }
    p { font-size: var(--medium-font-size); }

    .all-task {
      @include inner-spacing(var(--small-padding));
      :first-child { margin-top: var(--small-padding); }
      height: 0;
      box-sizing: border-box;
      transition: height $long-animation-time;
      overflow-y: hidden;

      .task-container {
        display: flex; align-items: center;
        &:hover p { @media (min-width: $mobile-width) { color: inherit !important; } }
        div {                              // colored dot per task
          flex: 0 0 auto;
          margin: 0 calc(var(--small-padding) / 2) 0 0;
          @include square(var(--small-padding));
          @media (max-width: $mobile-width) { @include square(calc(var(--small-padding) / 2)); }
        }
        p {
          white-space: nowrap; text-overflow: ellipsis; overflow-x: hidden;
          text-align: left;
          @media (max-width: $mobile-width) {
            font-size: calc(var(--small-font-size) / 2 + var(--medium-font-size) / 2);
          }
          position: relative;
        }
      }
    }
  }
}
```

Header: `<strong>N</strong> task(s)`. Click expands `.all-task` from `height: 0` to `scrollHeight` in 200ms. Each row: colored dot (size `var(--small-padding)`) + description with ellipsis. Text color is the block's color; hover resets to inherit.

### 6f. Modal shell — `modal.component`

```scss
section {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 10000;
  @include center-child();
  padding: var(--large-padding);
  box-sizing: border-box;
  background: $background-gradient;          // semi-transparent warm gradient!
  transition: opacity 300ms;
  &:not(.active) { opacity: 0; pointer-events: none; }
  button { margin-top: var(--medium-padding); }
}
```

Modal backdrop = the warm cream→pink gradient at 50% alpha layered over the app. **Distinctive.** Open transition opacity 0→1 in 300ms.

### 6g. Sub-modals (settings / remove-page / remove-tower / blocks-edit)

All small modals share the same card shell:

```scss
section / :host {
  @include card();
  width: 66vw;
  max-width: 400px;             // settings = 400, remove-* = 500
  @media (max-width: $mobile-width) { width: 300px; }
  box-sizing: border-box;
  padding: var(--large-padding);
  position: relative;
  box-shadow: $shadow;
  @include inner-spacing(var(--large-padding));

  .header {
    @include center-child();
    .exit {
      position: absolute;
      left: var(--large-padding);
      @include exit();                       // x-sign.svg, 16px box, 8px padding, jump hover
    }
  }
}
```

Block-edit modal is a **horizontally scrolling carousel** of cards. Each card 66vw / max 400px. Two transparent spacer cards at start/end so the active card centers. `.mask` overlay fades opaque on inactive neighbours. Snap-to-center on scroll-end (150ms idle).

`get-started.component`: stub — skip in port.

### 6h. Toggle (custom switch)

A **dual-label switch**: left label + oval track + right label. Active-side label gets `font-weight: bold`. Hover nudges the thumb 2px toward the other side.

```scss
:host {
  $size: 30px;
  @include center-child();
  @include inner-spacing(var(--medium-padding), $horizontal: true);

  span {
    @include medium-text();
    max-width: 3 * $size;
    cursor: pointer;
    &.active { font-weight: bold; }
    &:first-of-type { text-align: right; }
    &:last-of-type  { text-align: left; }
  }

  label { display: block;
    input[type='checkbox'] {
      -webkit-appearance: none; -moz-appearance: none;
      width: 2 * $size; height: $size;
      border-radius: 1000px;
      box-shadow: $shadow-border;
      position: relative;
      cursor: pointer;

      &:after {
        content: ''; position: absolute; display: block;
        left: 0;
        @include square($size);
        border-radius: 1000px;
        background-color: $text-color;
        transition: box-shadow $long-animation-time, left $long-animation-time, transform $long-animation-time;
      }
      &.on:after { left: $size; }

      @media (min-width: $mobile-width) {
        &:hover:after    { box-shadow: $shadow; transform: translateX(2px); }
        &.on:hover:after { transform: translateX(-2px); }
      }
    }
  }
}
```

### 6i. Select-add — `select-add.component`

A custom dropdown that doubles as inline creator (with `+ Add` button) and optional inline editor (pen icon, `editable=true`).

Top bar = white card showing selected text + arrow. Click → `.bottom` slides via `transform: translateY(-100%) → none` over 200ms. Other options listed as `<p>` rows. Bottom: text input + Add button + optional pen icon. Arrow rotates 180° when open.

```scss
.background {
  position: absolute; top: 0;
  height: 100%; width: 100%;
  @include card();
  z-index: 3;
  transition: box-shadow $long-animation-time, height $long-animation-time;
  &.active { box-shadow: $shadow; }
}
&:hover { @media (min-width: $mobile-width) { .background { box-shadow: $shadow; } } }
&.shadow-border { .background.active { box-shadow: $shadow-border; } }
```

Flags: `alwaysDropShadow` pre-applies open shadow. `onlyShadowBorder` swaps soft shadow for hairline (used inside block-edit modal).

### 6j. Double-slider (date-range — NOT an HSL picker)

CRITICAL CLARIFICATION: legacy `double-slider` is a **two-thumb date-range slider** filtering blocks by `created` date — not an HSL color picker. The HSL color picker for tower base-color doesn't exist in the legacy reference (the tower color was likely set elsewhere or hardcoded). This is what makes the page "beautiful": as a thumb approaches a date label, the label slides upward and rotates -45°, like magnetic markers.

```scss
$height: 70px;
$width: 300px;
$slider-size: 40px;

.container {
  width: $width;
  height: $height;
  position: relative;
  margin: $slider-size / 2 auto 0 auto;

  label { display: none; }

  input[type='range'] {
    width: 100%;
    position: absolute; left: 0;
    -webkit-appearance: none; outline: none;

    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      height: $slider-size;        // 40px
      width: $slider-size;
      border-radius: 1000px;
      background-color: $light-color;
      transform-origin: center center;
      transform: translateY(-$slider-size / 2 + $line-height / 2);
      transition: box-shadow $long-animation-time, transform $long-animation-time;
      @media (min-width: $mobile-width) {
        &:hover {
          box-shadow: $shadow;
          transform: translateY(-$slider-size / 2 + $line-height / 2) scale(1.1);
        }
      }
      cursor: pointer;
      position: relative; z-index: 2;
    }

    &::-webkit-slider-runnable-track {
      -webkit-appearance: none;
      width: 100%;
      height: $line-height;        // 2px
      background-color: $text-color;
      border-radius: 1000px;
    }
  }

  .value-container {
    @include small-text();
    display: flex; justify-content: space-evenly;
    span { display: block; margin-top: 10px; }
  }
}
```

Two stacked `<input type="range">` on the same track. White 40px circular thumbs, 2px solid track. Hover scales thumb 1.1× and adds `$shadow`.

Labels: `getOffset(index)` for each of 6 evenly-spaced date labels, compute distance to nearer thumb (normalized `[0,1]`); within 0.2 "active zone" the label translates upward by `(1 - d/0.2) * 30px`, rotated -45°.

---

## 7. Drag-and-drop

Tower list is a `cdkDropList cdkDropListOrientation="horizontal"`. Each `<app-tower>` is `cdkDrag`. Cursor: `pointer` (not grab/grabbing).

- `.cdk-drag-animating` → tower `transition: transform 250ms cubic-bezier(0,0,0.2,1)`.
- `.cdk-drag-placeholder` → `opacity: 0`.
- `.cdk-drag-preview` → mobile fades `box-shadow` in via inline `@keyframes shadow` over 200ms.
- `.cdk-drop-list-dragging *:not(.cdk-drag-placeholder)` → `transition: transform 200ms cubic-bezier(0,0,0.2,1)`.

Trash interaction (`page.component.ts:69-91`):
- `pointerenter` on trash → `nearTrashcan=true`, append `' trash-highlight'` to `.cdk-drag-preview`'s className.
- `pointerleave` → remove class.
- `pointerup` on trash → open remove-tower confirm modal.

During drag:
- `isDragging` true → trash icon `.active` springs in.
- `isDragHappening` emitted up → Settings button fades to opacity 0.
- Date-slider container fades to opacity 0.

---

## 8. Image assets

All SVGs in `_legacy_reference/frontend/src/assets/`:

| File | Where used | Size | Behaviour |
|---|---|---|---|
| `arrow.svg` | `select-add` top bar | `square(16px)` | rotates `-180deg` open, transition 200ms |
| `pen.svg` | `select-add` edit button, blocks-modal edit | `square(16px)` in wrapper | `opacity: 0.25 → 0.5 (hover) → 1 (active)`; `:before` 2px underline expands 0→100% over 200ms |
| `plus-sign.svg` | Tower internal add-block, end-of-row add-tower | `height: 48px` desktop, `32px` mobile | `opacity: 0.33 → 1` (hover) over 200ms |
| `trash.svg` | Page absolute-positioned trash zone | `square(48px); padding: 16px` (80×80 hit box), `bottom: 8px; left: 50%` | `scale(0) → scale(1) (.active) → scale(1.1) (hover)`; `translateX(-50%)` preserved |
| `x-sign.svg` | All modal exit buttons | 16px inner, 8px padding, `background-size: 50% 50%` | `@include jump()` hover lift |

---

## 9. Per-state styling

### Block
- **Pending** (`!isDone`): appears **only in `<app-tasks>` accordion** as a colored-dot row.
- **Done** (`isDone === true`): appears as a 1/6-tower-width colored square in the falling stack.
- **Filtered out by date slider**: `.ascend` class, transitions out over 1.5s (opacity delayed 1s).
- **Hover** (done block): `gravitate()` → `box-shadow: $shadow` + `transform: scale(1.1)` in 200ms.

### Tower
- **Idle**: white card.
- **Hover** (desktop): `box-shadow: $shadow` over 200ms.
- **Dragging preview**: mobile fades shadow in over 200ms.
- **Drag placeholder**: `opacity: 0`.
- **Over trash (`.trash-highlight`)**: `scale(0.75)`, red overlay at 0.5 opacity, name input hidden.

### Page-tab (select-add for pages)
No active/inactive — only "currently selected page" at top of dropdown.
- **Closed**: white card, hairline shadow on hover.
- **Open**: `$shadow` (or `$shadow-border` if `onlyShadowBorder`).

---

## Implementation order

1. Drop `library/*.scss` into `frontend/src/library/` verbatim. Update `styles.scss` to import them.
2. Apply global body/html/scrollbar styles.
3. Load Google Fonts (Open Sans Condensed 300 + Raleway). Drop the self-hosted-fonts I added if they're locked at incorrect weights — re-verify woff2 files cover the right weights and rewrite @font-face cleanly. Keep self-hosting if you want, just match the weights exactly.
4. Set `<meta name="theme-color" content="#5d576b" />`.
5. Build `select-add`, `toggle`, `double-slider` first.
6. Build modal shell + sub-modals using the shared card recipe.
7. Build tower → block → tasks.
8. Build page with the `@for $i from 1 to 6` width calc and trash zone.
9. Wire the "falling animation" exactly per §4a — the `setTimeout(..., 0)` two-step is essential.

---

## Critical model recap for implementers

- **Block has a `tag`** (string) and **does NOT have a description** in the legacy UI. The "description" field in the new app is not in the legacy data model — the legacy block is just `{ id, tag, isDone, created }` plus optionally derived data. Verify against the legacy `block.ts` and `IBlock` interface. The NEW backend's normalized schema has a `description` — keep it, but make it OPTIONAL and don't render it as the block's primary visual.
- **Tower color picker**: NOT in the legacy reference. The new app's color-picker exists; align its visuals with the rest of the design (white card, $shadow, etc.) but don't pretend it matches a legacy that didn't exist.
- **Date-range filter**: the double-slider in the legacy filtered blocks by their `created` date. Decide whether to port this (recommended — it's the "beautiful slider" the user remembers).
