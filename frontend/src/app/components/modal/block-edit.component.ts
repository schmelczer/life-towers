import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  signal,
  computed,
  effect,
  viewChild,
  ElementRef,
  AfterViewInit,
  HostListener,
  untracked,
} from '@angular/core';
import { Block, HslColor } from '../../models';
import { SelectAddComponent } from '../shared/select-add/select-add.component';
import { ToggleComponent } from '../shared/toggle/toggle.component';
import { getColorOfTag } from '../../utils/color';

export interface BlockEditSave {
  /** null = create a new block */
  id: string | null;
  tag: string;
  description: string;
  is_done: boolean;
}

interface EditedValue {
  tag: string;
  description: string;
  is_done: boolean;
}

@Component({
  selector: 'lt-block-edit',
  standalone: true,
  imports: [SelectAddComponent, ToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      #container
      class="carousel"
      (scroll)="onScroll()"
      (click)="onBackdropClick($event)"
    >
      <div class="card placeholder"></div>

      @for (b of blocks(); track b.id; let i = $index) {
        <div
          class="card"
          [class.active]="activeIdx() === i + 1"
          [class.near-active]="activeIdx() === i || activeIdx() === i + 2"
          (click)="onCardClick(i + 1)"
        >
          <div class="mask"></div>

          <div class="header">
            <div class="exit" (click)="close.emit(); $event.stopPropagation()"></div>
            <div
              class="block-dot"
              [style.background-color]="colorOfTagForBlock(b.id)"
            ></div>
            <h1>{{ formatDate(b.created_at) }}</h1>
          </div>

          <div class="select-add-container">
            <lt-select-add
              [items]="tags()"
              [selected]="editedFor(b.id).tag"
              [alwaysDropShadow]="true"
              [onlyShadowBorder]="true"
              placeholder="Tag this item…"
              (select)="updateTag(b.id, $event)"
              (add)="updateTag(b.id, $event)"
            />
          </div>

          <textarea
            placeholder="Write a description here…"
            [value]="editedFor(b.id).description"
            (input)="updateDescription(b.id, $any($event.target).value)"
            (blur)="flushExisting(b.id)"
          ></textarea>

          <div>
            <lt-toggle
              [checked]="editedFor(b.id).is_done"
              (checkedChange)="updateDone(b.id, $event)"
              offLabel="This task hasn't been finished yet"
              onLabel="Goal already accomplished"
            />
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
        (click)="onCardClick(blocks().length + 1)"
      >
        <div class="mask"></div>

        <div class="header">
          <div class="exit" (click)="close.emit(); $event.stopPropagation()"></div>
          <div
            class="block-dot"
            [style.background-color]="colorOfNewTag()"
          ></div>
          <h1>Create now</h1>
        </div>

        <div class="select-add-container">
          <lt-select-add
            [items]="tags()"
            [selected]="newValue().tag"
            [alwaysDropShadow]="true"
            [onlyShadowBorder]="true"
            placeholder="Set a category…"
            (select)="updateNewTag($event)"
            (add)="updateNewTag($event)"
          />
        </div>

        <textarea
          placeholder="Write a description here…"
          [value]="newValue().description"
          (input)="updateNewDescription($any($event.target).value)"
        ></textarea>

        <div>
          <lt-toggle
            [checked]="newValue().is_done"
            (checkedChange)="updateNewDone($event)"
            offLabel="This task hasn't been finished yet"
            onLabel="Goal already accomplished"
          />
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
      z-index: 10001; // above modal backdrop (10000)
    }

    .carousel {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      box-sizing: border-box;
      overflow-x: auto;
      overflow-y: hidden;
      scroll-behavior: smooth;

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
      @media (max-width: $mobile-width) {
        width: 300px;
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
        box-shadow: none;
        background: transparent;
      }

      .header {
        @include center-child();
        position: relative;

        .exit {
          position: absolute;
          left: 0;
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
    }
  `,
})
export class BlockEditComponent implements AfterViewInit {
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
  });

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
        });
      }
      untracked(() => this.editedValues.set(m));
    });

    // Seed the newValue tag from tags input on first run.
    effect(() => {
      const t = this.tags();
      untracked(() => {
        const cur = this.newValue();
        if (!cur.tag && t.length > 0) {
          this.newValue.set({ ...cur, tag: t[0], is_done: this.defaultDone() });
        } else if (!cur.tag) {
          this.newValue.set({ ...cur, is_done: this.defaultDone() });
        }
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
      }
    );
  }

  colorOfTagForBlock(id: string): string {
    const v = this.editedFor(id);
    return v.tag ? getColorOfTag(v.tag, this.baseColor()) : 'transparent';
  }

  colorOfNewTag = computed(() => {
    const t = this.newValue().tag;
    return t ? getColorOfTag(t, this.baseColor()) : 'transparent';
  });

  formatDate(ts: number): string {
    const d = new Date(ts * 1000);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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
    this.save.emit({ id, tag: v.tag, description: v.description, is_done: v.is_done });
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
    this.newValue.update((v) => ({ ...v, is_done }));
  }

  submitNew(): void {
    const v = this.newValue();
    if (!v.tag) return;
    this.save.emit({
      id: null,
      tag: v.tag,
      description: v.description,
      is_done: v.is_done,
    });
    this.close.emit();
  }

  // ── Scroll handling ────────────────────────────────────────────────────────

  onCardClick(idx: number): void {
    if (idx !== this.activeIdx()) {
      this.scrollToChild(idx, true);
    }
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
    container.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
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
