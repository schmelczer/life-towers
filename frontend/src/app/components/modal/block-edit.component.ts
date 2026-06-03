import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  effect,
  viewChild,
  ElementRef,
  AfterViewInit,
  HostListener,
  untracked,
} from '@angular/core';
import { Block, HslColor } from '../../models';
import { SelectAddComponent } from '../shared/select-add/select-add.component';
import { getColorOfTag } from '../../utils/color';

export interface BlockEditSave {
  /** null = create a new block */
  id: string | null;
  tag: string;
  description: string;
  is_done: boolean;
  difficulty: number;
}

interface EditedValue {
  tag: string;
  description: string;
  is_done: boolean;
  difficulty: number;
}

function clampDifficulty(value: number): number {
  return Math.max(1, Math.min(100, value));
}

export function createDoneValue(defaultDone: boolean, currentDone: boolean, edited: boolean): boolean {
  return edited ? currentDone : defaultDone;
}

@Component({
  selector: 'lt-block-edit',
  standalone: true,
  imports: [SelectAddComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (viewTitle()) {
      <h2 class="view-title">{{ viewTitle() }}</h2>
    }

    <section
      #container
      class="carousel"
      (scroll)="onScroll()"
      (click)="onBackdropClick($event)"
      (keydown.enter)="onBackdropClick($any($event))"
      tabindex="-1"
    >
      <div class="card placeholder"></div>

      @for (b of blocks(); track b.id; let i = $index) {
        <div
          class="card"
          [class.active]="activeIdx() === i + 1"
          [class.near-active]="activeIdx() === i || activeIdx() === i + 2"
          role="button"
          tabindex="0"
          [attr.aria-label]="'Focus ' + (editedFor(b.id).tag || 'block')"
          (click)="onCardClick(i + 1)"
          (keydown.enter)="onCardKey($event, i + 1)"
          (keydown.space)="onCardKey($event, i + 1)"
        >
          <div class="mask"></div>

          <div class="header">
            <button
              class="exit"
              type="button"
              aria-label="Close"
              (click)="close.emit(); $event.stopPropagation()"
            ></button>
            <div
              class="block-dot"
              [style.background-color]="colorOfTagForBlock(b.id)"
            ></div>
            <h1>{{ formatDate(b.created_at, true) }}</h1>
          </div>

          <div class="select-add-container">
            <lt-select-add
              [items]="tags()"
              [selected]="editedFor(b.id).tag"
              [alwaysDropShadow]="true"
              [onlyShadowBorder]="true"
              [placeholder]="tagPlaceholder('Tag this item…')"
              (select)="updateTag(b.id, $event)"
              (add)="updateTag(b.id, $event)"
            />
          </div>

          <textarea
            placeholder="Write a description here…"
            maxlength="10000"
            [value]="editedFor(b.id).description"
            (input)="updateDescription(b.id, $any($event.target).value)"
            (blur)="flushExisting(b.id)"
          ></textarea>

          <label class="done-checkbox">
            <input
              type="checkbox"
              [checked]="editedFor(b.id).is_done"
              (change)="updateDone(b.id, $any($event.target).checked)"
            />
            <span>Already done</span>
          </label>

          <div class="difficulty">
            <span class="label">Difficulty</span>
            <div class="stepper">
              <button
                type="button"
                class="step"
                aria-label="Decrease difficulty"
                [disabled]="editedFor(b.id).difficulty <= 1"
                (click)="updateDifficulty(b.id, -1); $event.stopPropagation()"
              >−</button>
              <span class="value">{{ editedFor(b.id).difficulty }}</span>
              <button
                type="button"
                class="step"
                aria-label="Increase difficulty"
                [disabled]="editedFor(b.id).difficulty >= 100"
                (click)="updateDifficulty(b.id, 1); $event.stopPropagation()"
              >+</button>
            </div>
          </div>

          <div class="bottom">
            <button (click)="onDelete(b.id); $event.stopPropagation()">Delete</button>
          </div>
        </div>
      }

      <div
        class="card create-card"
        [class.active]="activeIdx() === blocks().length + 1"
        [class.near-active]="activeIdx() === blocks().length"
        role="button"
        tabindex="0"
        aria-label="Focus create card"
        (click)="onCardClick(blocks().length + 1)"
        (keydown.enter)="onCardKey($event, blocks().length + 1)"
        (keydown.space)="onCardKey($event, blocks().length + 1)"
      >
        <div class="mask"></div>

        <div class="header">
          <button
            class="exit"
            type="button"
            aria-label="Close"
            (click)="close.emit(); $event.stopPropagation()"
          ></button>
          <div
            class="block-dot"
            [style.background-color]="colorOfNewTag()"
          ></div>
          <h1>Create now</h1>
        </div>

        <div class="select-add-container" [class.required-empty]="!newValue().tag">
          <lt-select-add
            [items]="tags()"
            [selected]="newValue().tag"
            [alwaysDropShadow]="true"
            [onlyShadowBorder]="true"
            [placeholder]="tagPlaceholder('Set a category…')"
            (select)="updateNewTag($event)"
            (add)="updateNewTag($event)"
          />
        </div>

        <textarea
          placeholder="Write a description here…"
          maxlength="10000"
          [value]="newValue().description"
          (input)="updateNewDescription($any($event.target).value)"
        ></textarea>

        <label class="done-checkbox">
          <input
            type="checkbox"
            [checked]="newValue().is_done"
            (change)="updateNewDone($any($event.target).checked)"
          />
          <span>Already done</span>
        </label>

        <div class="difficulty">
          <span class="label">Difficulty</span>
          <div class="stepper">
            <button
              type="button"
              class="step"
              aria-label="Decrease difficulty"
              [disabled]="newValue().difficulty <= 1"
              (click)="updateNewDifficulty(-1); $event.stopPropagation()"
            >−</button>
            <span class="value">{{ newValue().difficulty }}</span>
            <button
              type="button"
              class="step"
              aria-label="Increase difficulty"
              [disabled]="newValue().difficulty >= 100"
              (click)="updateNewDifficulty(1); $event.stopPropagation()"
            >+</button>
          </div>
        </div>

        <div class="bottom">
          <button
            (click)="submitNew(); $event.stopPropagation()"
            [disabled]="!newValue().tag"
          >
            Create and exit
          </button>
        </div>
      </div>

      <div class="card placeholder"></div>
    </section>
  `,
  styles: `
    @import '../../../library/main';

    :host {
      @include center-child();
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      // Cover the *visible* viewport. Sizing via top:0/bottom:0 uses the layout
      // viewport, which on mobile extends behind the browser's bottom toolbar
      // (and the soft keyboard) — so the vertically-centered card gets its
      // bottom cut off. 100dvh tracks the area that's actually on screen;
      // browsers without dvh fall back to the top/bottom inset above.
      height: 100dvh;
      z-index: 10001; // above modal backdrop (10000)

      @media (max-height: $min-height) {
        align-items: flex-start;
        overflow-y: auto;
      }
    }

    .view-title {
      position: fixed;
      top: var(--large-padding);
      left: var(--large-padding);
      right: var(--large-padding);
      z-index: 10002;
      margin: 0;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events: none;
    }

    .carousel {
      --title-clearance: calc((var(--large-padding) * 2) + var(--larger-font-size));
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      box-sizing: border-box;
      padding: var(--title-clearance) 0 var(--large-padding);
      overflow-x: auto;
      overflow-y: hidden;
      scroll-behavior: smooth;
      scroll-snap-type: x mandatory;

      @media (max-width: $mobile-width) {
        padding: var(--title-clearance) var(--medium-padding) var(--medium-padding);
        // Keep the card centered when it fits, but never clip it: 'safe center'
        // falls back to top-alignment when the card is taller than the visible
        // viewport, and overflow-y lets the user scroll down to the bottom
        // (delete/create button) — e.g. when the soft keyboard shrinks the view.
        align-items: safe center;
        overflow-y: auto;
      }

      @media (max-height: $min-height) {
        min-height: max-content;
        align-items: flex-start;
        padding-top: var(--title-clearance);
        padding-bottom: var(--medium-padding);
        overflow-y: visible;
      }

      &::-webkit-scrollbar {
        width: 0;
        height: 0;
      }
    }

    .card {
      @include card();
      box-shadow: $shadow;
      display: block;
      transform-origin: center center;
      flex: 0 0 auto;
      width: 66vw;
      max-width: 400px;
      scroll-snap-align: center;
      @media (max-width: $mobile-width) {
        width: min(88vw, 360px);
        max-width: calc(100vw - (2 * var(--medium-padding)));
        padding: var(--medium-padding);
        margin: 0 calc(var(--small-padding) / 2);
        opacity: 1 !important;
      }
      box-sizing: border-box;
      padding: var(--large-padding);
      margin: calc(var(--large-padding) / 2);
      position: relative;
      @include inner-spacing(var(--large-padding));

      opacity: 0.6;
      transition: opacity $long-animation-time;

      &.near-active {
        cursor: pointer;
        opacity: 0.85;
      }

      &.active {
        opacity: 1;
      }

      .mask {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        @include card();
        opacity: 1;
        transition: opacity $long-animation-time;
        pointer-events: none;
        @media (max-width: $mobile-width) {
          opacity: 0 !important;
        }
      }

      &.active .mask {
        opacity: 0;
      }

      &.near-active .mask {
        opacity: 0.55;
      }

      &:first-child {
        margin-left: var(--large-padding);
      }

      &.placeholder {
        opacity: 0 !important;
        width: 60vw;
        max-width: 60vw;
        @media (max-width: $mobile-width) {
          width: var(--medium-padding);
          max-width: var(--medium-padding);
          min-width: var(--medium-padding);
        }
        box-shadow: none;
        background: transparent;
      }

      .header {
        @include center-child();
        position: relative;
        gap: var(--small-padding);

        h1 {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .exit {
          position: absolute;
          right: 0;
          @include exit();
        }

        .block-dot {
          @include square(12px);
          margin-right: 10px;
          border-radius: 2px;
        }
      }

      .select-add-container {
        // When the create card has no tag chosen, glow the dropdown red as a
        // gentle "required" cue — matches the legacy ghost-button affordance.
        &.required-empty lt-select-add {
          box-shadow: 0 0 0 0.75px rgba(181, 63, 63, 0.5);
          border-radius: var(--border-radius);
        }
      }

      .done-checkbox {
        @include medium-text();
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--small-padding);
        width: max-content;
        max-width: 100%;
        margin: 0 auto var(--medium-padding);
        cursor: pointer;

        input[type='checkbox'] {
          -webkit-appearance: none;
          appearance: none;
          @include square(22px);
          flex: 0 0 auto;
          position: relative;
          box-sizing: border-box;
          margin: 0;
          border: 0;
          border-radius: 4px;
          background: $light-color;
          box-shadow: $shadow-border;
          cursor: pointer;
          transition: background-color $short-animation-time, box-shadow $long-animation-time, transform $short-animation-time;

          &::after {
            content: '';
            position: absolute;
            left: 7px;
            top: 3px;
            width: 6px;
            height: 12px;
            border: solid $light-color;
            border-width: 0 2px 2px 0;
            opacity: 0;
            transform: rotate(45deg) scale(0.8);
            transition: opacity $short-animation-time, transform $short-animation-time;
          }

          &:checked {
            background: $text-color;

            &::after {
              opacity: 1;
              transform: rotate(45deg) scale(1);
            }
          }

          &:hover,
          &:focus-visible {
            box-shadow: $shadow;
          }

          &:active {
            transform: scale(0.95);
          }
        }

        span {
          line-height: 1.3;
        }
      }

      .difficulty {
        @include medium-text();
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--small-padding);
        width: max-content;
        max-width: 100%;
        margin: 0 auto var(--medium-padding);

        .stepper {
          display: flex;
          align-items: center;
          gap: var(--small-padding);

          .value {
            min-width: 1.5em;
            text-align: center;
            font-variant-numeric: tabular-nums;
          }

          button.step {
            all: unset;                       // strip native + global button styles
            @include square(22px);
            @include center-child();
            flex: 0 0 auto;
            box-sizing: border-box;
            border-radius: 4px;
            background: $light-color;
            box-shadow: $shadow-border;
            cursor: pointer;
            // all:unset drops the font to serif and the global button's hover
            // underline (button::after) survives the reset — re-assert both.
            font: bold 18px/1 $normal-font;
            color: $text-color;
            user-select: none;
            transition: box-shadow $long-animation-time, transform $short-animation-time, opacity $short-animation-time;

            &::after { content: none; }

            @media (max-width: $mobile-width) {
              @include square(26px);
            }

            &:hover,
            &:focus-visible {
              box-shadow: $shadow;
            }

            &:active {
              transform: scale(0.95);
            }

            &:disabled {
              opacity: 0.4;
              cursor: not-allowed;
              box-shadow: $shadow-border;
            }
          }
        }
      }

      .bottom {
        height: 32px;
        @media (max-width: $mobile-width) {
          height: 24px;
        }
        position: relative;

        button {
          margin: 0;
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translateY(-50%) translateX(-50%);
        }
      }

      @media (max-width: $mobile-width) {
        lt-select-add,
        .done-checkbox {
          max-width: 100%;
          width: 100%;
        }

        .bottom {
          min-height: 42px;

          button {
            width: max-content;
            max-width: 100%;
            min-height: 42px;
          }
        }
      }
    }
  `,
})
export class BlockEditComponent implements AfterViewInit {
  readonly viewTitle = input<string>('');
  readonly blocks = input.required<Block[]>();
  readonly activeBlockId = input<string | null>(null);
  readonly tags = input<string[]>([]);
  readonly baseColor = input.required<HslColor>();
  /** Default for `is_done` on the create card. */
  readonly defaultDone = input<boolean>(true);

  readonly save = output<BlockEditSave>();
  readonly delete = output<string>();
  readonly close = output<void>();

  private readonly container =
    viewChild<ElementRef<HTMLElement>>('container');

  // Per-block edited values, keyed by block ID.
  readonly editedValues = signal<Map<string, EditedValue>>(new Map());

  // Pending new block being authored on the create card.
  readonly newValue = signal<EditedValue>({
    tag: '',
    description: '',
    is_done: true,
    difficulty: 1,
  });
  private newDoneEdited = false;

  // 1-based index of the centered card. 0/N+2 are placeholders.
  readonly activeIdx = signal(1);

  private scrollToken = 0;

  constructor() {
    // Seed editedValues from input blocks (and re-seed if input changes).
    effect(() => {
      const bs = this.blocks();
      const m = new Map<string, EditedValue>();
      for (const b of bs) {
        m.set(b.id, {
          tag: b.tag,
          description: b.description,
          is_done: b.is_done,
          difficulty: b.difficulty ?? 1,
        });
      }
      untracked(() => this.editedValues.set(m));
    });

    // Seed the newValue tag from tags input on first run.
    effect(() => {
      const t = this.tags();
      untracked(() => {
        const cur = this.newValue();
        if (!cur.tag) {
          this.newValue.set({
            ...cur,
            tag: t.length > 0 ? t[0] : '',
          });
        }
      });
    });

    effect(() => {
      const isDone = this.defaultDone();
      untracked(() => {
        this.newValue.update((v) => ({
          ...v,
          is_done: createDoneValue(isDone, v.is_done, this.newDoneEdited),
        }));
      });
    });
  }

  ngAfterViewInit(): void {
    // Position scroll on the focused card (or the create card if none).
    queueMicrotask(() => {
      const blocks = this.blocks();
      const focusId = this.activeBlockId();
      const focusIdx = focusId
        ? Math.max(0, blocks.findIndex((b) => b.id === focusId))
        : blocks.length;
      this.scrollToChild(focusIdx + 1, false);
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  editedFor(id: string): EditedValue {
    return (
      this.editedValues().get(id) ?? {
        tag: '',
        description: '',
        is_done: false,
        difficulty: 1,
      }
    );
  }

  private colorOfTag(tag: string): string {
    return tag ? getColorOfTag(tag, this.baseColor()) : 'transparent';
  }

  colorOfTagForBlock(id: string): string {
    return this.colorOfTag(this.editedFor(id).tag);
  }

  tagPlaceholder(fallback: string): string {
    return this.tags().length === 0 ? 'No tags yet. Open to create one.' : fallback;
  }

  colorOfNewTag(): string {
    return this.colorOfTag(this.newValue().tag);
  }

  formatDate(ts: number, compact = false): string {
    const d = new Date(ts * 1000);
    if (compact) {
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    // e.g. "May 28, 2026, 14:32"
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ── Existing-card mutations (auto-save on each change) ─────────────────────

  updateTag(id: string, tag: string): void {
    this.patchEdited(id, { tag });
    this.flushExisting(id);
  }

  updateDescription(id: string, description: string): void {
    this.patchEdited(id, { description });
    // Description flush deferred to (blur) to avoid PUT per keystroke.
  }

  updateDone(id: string, is_done: boolean): void {
    this.patchEdited(id, { is_done });
    this.flushExisting(id);
  }

  updateDifficulty(id: string, delta: number): void {
    const next = clampDifficulty(this.editedFor(id).difficulty + delta);
    this.patchEdited(id, { difficulty: next });
    this.flushExisting(id);
  }

  private patchEdited(id: string, patch: Partial<EditedValue>): void {
    this.editedValues.update((m) => {
      const v = m.get(id);
      if (!v) return m;
      const next = new Map(m);
      next.set(id, { ...v, ...patch });
      return next;
    });
  }

  flushExisting(id: string): void {
    const v = this.editedFor(id);
    if (!v.tag) return; // Skip empty saves
    this.save.emit({
      id,
      tag: v.tag,
      description: v.description,
      is_done: v.is_done,
      difficulty: v.difficulty,
    });
  }

  onDelete(id: string): void {
    this.delete.emit(id);
  }

  // ── Create-card mutations ──────────────────────────────────────────────────

  updateNewTag(tag: string): void {
    this.newValue.update((v) => ({ ...v, tag }));
  }

  updateNewDescription(description: string): void {
    this.newValue.update((v) => ({ ...v, description }));
  }

  updateNewDone(is_done: boolean): void {
    this.newDoneEdited = true;
    this.newValue.update((v) => ({ ...v, is_done }));
  }

  updateNewDifficulty(delta: number): void {
    this.newValue.update((v) => ({ ...v, difficulty: clampDifficulty(v.difficulty + delta) }));
  }

  submitNew(): void {
    const v = this.newValue();
    if (!v.tag) return;
    this.save.emit({
      id: null,
      tag: v.tag,
      description: v.description,
      is_done: v.is_done,
      difficulty: v.difficulty,
    });
    this.close.emit();
  }

  // ── Scroll handling ────────────────────────────────────────────────────────

  onCardClick(idx: number): void {
    if (idx !== this.activeIdx()) {
      this.scrollToChild(idx, true);
    }
  }

  /**
   * Activate a card via Space/Enter only when the card itself is focused. The
   * card is a role="button" that wraps the description textarea and the tag
   * input; without this guard the keydown bubbles up from those fields and the
   * space handler's preventDefault() swallows the space, making it impossible
   * to type spaces while editing a block.
   */
  onCardKey(event: Event, idx: number): void {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    this.onCardClick(idx);
  }

  /** Close the carousel when the user clicks anywhere that isn't a real card. */
  onBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && !target.closest('.card:not(.placeholder)')) {
      this.close.emit();
    }
  }

  onScroll(): void {
    const token = ++this.scrollToken;
    setTimeout(() => {
      if (token === this.scrollToken) this.adjustPosition();
    }, 150);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.scrollToChild(this.activeIdx(), false);
  }

  private scrollToChild(idx: number, smooth: boolean): void {
    const container = this.container()?.nativeElement;
    if (!container) return;
    const card = container.children.item(idx) as HTMLElement | null;
    if (!card) return;
    const left =
      card.offsetLeft - (container.clientWidth - card.offsetWidth) / 2;
    // 'instant' (not 'auto') is required: the carousel sets `scroll-behavior:
    // smooth`, and 'auto' defers to that — so the initial open would *animate*
    // a scroll across the whole strip to reach the target card (very visible on
    // mobile, where the carousel can be thousands of px wide). Tap-to-navigate
    // still passes smooth=true for the nice slide between cards.
    container.scrollTo({ left, behavior: smooth ? 'smooth' : 'instant' });
    this.activeIdx.set(idx);
  }

  private adjustPosition(): void {
    const container = this.container()?.nativeElement;
    if (!container) return;
    const center = container.scrollLeft + container.clientWidth / 2;
    let nearestIdx = 1;
    let minDist = Infinity;
    // children[0] and children[last] are the placeholders — skip.
    for (let i = 1; i < container.children.length - 1; i++) {
      const child = container.children.item(i) as HTMLElement;
      const c = child.offsetLeft + child.offsetWidth / 2;
      const d = Math.abs(c - center);
      if (d < minDist) {
        minDist = d;
        nearestIdx = i;
      }
    }
    if (nearestIdx !== this.activeIdx()) {
      this.scrollToChild(nearestIdx, true);
    }
  }
}
