import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  effect,
  untracked,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  viewChild,
} from '@angular/core';
import { Tower, Block } from '../../models';
import { BlockComponent } from '../block/block.component';
import { TasksComponent } from '../tasks/tasks.component';
import { BlockEditComponent, BlockEditSave } from '../modal/block-edit.component';
import { ModalComponent } from '../modal/modal.component';
import { TowerSettingsComponent, TowerSettingsResult } from '../modal/tower-settings.component';
import { toCss } from '../../utils/color';

/** Tracks which entry path the block-edit modal was opened from. */
export interface EditEntry {
  filter: 'done' | 'pending';
  activeId: string | null;
}

export function editEntryForNewBlock(keepTasksOpen: boolean): EditEntry {
  return {
    filter: keepTasksOpen ? 'pending' : 'done',
    activeId: null,
  };
}

/** A done block augmented with per-render animation state. */
export interface StyledBlock extends Block {
  _anim: '' | 'descend' | 'ascend';
  _transform: string;
  _opacity: string;
}

/** One rendered square. A block draws `difficulty` squares, all sharing the
 *  block's color + animation state. */
interface RenderSquare {
  key: string;
  block: StyledBlock;
}

const BLOCKS_PER_ROW = 6;

/** How many squares a block draws (its difficulty, clamped to >= 1). */
function squareCount(block: Block): number {
  const n = Math.floor(block.difficulty ?? 1);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function totalSquares(blocks: Block[]): number {
  return blocks.reduce((sum, block) => sum + squareCount(block), 0);
}

/** Pick the newest blocks (array tail) whose cumulative square-count (each
 *  block costs `difficulty` squares) fits within `limit`, preserving order. */
function fitNewestBySquares(blocks: StyledBlock[], limit: number): StyledBlock[] {
  const chosen: StyledBlock[] = [];
  let used = 0;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const cost = squareCount(blocks[i]);
    if (used + cost > limit) break;
    used += cost;
    chosen.unshift(blocks[i]);
  }
  return chosen;
}

export function selectVisibleStyledBlocks(
  styled: StyledBlock[],
  visibleLimit: number,
  enteringInRangeId: string | null,
  prevVisibleIds: ReadonlySet<string> = new Set(),
): { visibleStyled: StyledBlock[]; hiddenCount: number } {
  // `visibleLimit` is a number of SQUARE slots. A block draws `difficulty`
  // squares, so we cap by cumulative square cost, not by raw block count.
  const normalizedLimit = Math.max(0, visibleLimit);
  const restingBlocks = styled.filter((b) => b._opacity === '1');
  let shownRestingBlocks = fitNewestBySquares(restingBlocks, normalizedLimit);
  const enteringBlock =
    enteringInRangeId === null ? undefined : restingBlocks.find((b) => b.id === enteringInRangeId);

  if (enteringBlock && !shownRestingBlocks.some((b) => b.id === enteringBlock.id)) {
    // Guarantee the just-completed block a slot, then fill the remaining
    // square budget with the newest of the others.
    const reservedBudget = Math.max(0, normalizedLimit - squareCount(enteringBlock));
    const others = restingBlocks.filter((b) => b.id !== enteringBlock.id);
    shownRestingBlocks = [enteringBlock, ...fitNewestBySquares(others, reservedBudget)];
  }

  const hiddenCount = Math.max(0, totalSquares(restingBlocks) - totalSquares(shownRestingBlocks));

  // Blocks leaving past the upper date bound (opacity 0, `_anim: 'ascend'`) must
  // stay in the render list so their fly-up transition actually plays — even
  // when the resting stack already fills the whole square budget. Without this,
  // a capped stack (e.g. the example page) destroys the element the instant the
  // slider hides it and it just vanishes. Restrict to blocks that were visible a
  // moment ago: ones already off-screen have nothing to animate from, so leaving
  // them out keeps the rendered set (and the phantom flex slots) bounded.
  const exitingBlocks = styled.filter((b) => b._opacity !== '1' && prevVisibleIds.has(b.id));

  const shownIds = new Set([
    ...shownRestingBlocks.map((b) => b.id),
    ...exitingBlocks.map((b) => b.id),
  ]);

  return {
    hiddenCount,
    visibleStyled: styled.filter((b) => shownIds.has(b.id)),
  };
}

@Component({
  selector: 'lt-tower',
  standalone: true,
  imports: [BlockComponent, TasksComponent, ModalComponent, TowerSettingsComponent, BlockEditComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #towerRoot class="tower">
      <div class="tower-header">
        <input
          #nameInput
          type="text"
          [value]="tower().name"
          [style.color]="towerNameCss()"
          (pointerdown)="$event.stopPropagation()"
          (blur)="onRename($event)"
          (keydown.enter)="nameInput.blur()"
        />

        <button
          type="button"
          class="edit-tower"
          aria-label="Edit tower"
          (click)="$event.stopPropagation(); showSettings.set(true)"
        >
          <img src="assets/pen.svg" alt="" />
        </button>
      </div>

      <div
        class="container"
      >
        <lt-tasks
          [pending]="pending()"
          [baseColor]="tower().base_color"
          [initiallyOpen]="keepTasksOpen()"
          (pointerdown)="$event.stopPropagation()"
          (markDone)="onMarkTaskDone($event)"
          (edit)="onEditBlock($event)"
        />

        <div
          #stackZone
          class="stack-zone"
          [style.--block-stack-height]="blockStackHeight()"
        >
          <img
            src="assets/plus-sign.svg"
            class="add-block"
            alt="Add block"
            role="button"
            tabindex="0"
            (pointerdown)="$event.stopPropagation()"
            (click)="$event.stopPropagation(); openAddBlock()"
            (keydown.enter)="$event.stopPropagation(); openAddBlock()"
            (keydown.space)="$event.preventDefault(); $event.stopPropagation(); openAddBlock()"
          />

          <div class="block-container-container">
            <div class="block-container">
              @for (sq of squares(); track sq.key; let i = $index) {
                <lt-block
                  [block]="sq.block"
                  [baseColor]="tower().base_color"
                  [hovered]="hoveredBlockId() === sq.block.id"
                  [attr.data-block-id]="sq.block.id"
                  [class.descend]="sq.block._anim === 'descend'"
                  [class.ascend]="sq.block._anim === 'ascend'"
                  [style.transform]="sq.block._transform"
                  [style.opacity]="sq.block._opacity"
                  [style.z-index]="squares().length - i"
                  (pointerenter)="onBlockPointerEnter(sq.block.id)"
                  (pointerleave)="onBlockPointerLeave(sq.block.id, $event)"
                  (clicked)="onEditBlock(sq.block)"
                />
              }
            </div>
          </div>
        </div>
      </div>

      @if (hiddenBlockCount() > 0) {
        <p class="more-blocks">+ {{ hiddenBlockCount() }} more</p>
      }
    </div>

    @if (editEntry(); as entry) {
      <lt-modal (close)="closeEdit()">
        <lt-block-edit
          [viewTitle]="editViewTitle()"
          [blocks]="filteredForEntry()"
          [activeBlockId]="entry.activeId"
          [tags]="towerTags()"
          [baseColor]="tower().base_color"
          [defaultDone]="entry.filter === 'done'"
          (save)="onBlockSave($event)"
          (delete)="onBlockDelete($event)"
          (close)="closeEdit()"
        />
      </lt-modal>
    }

    @if (showSettings()) {
      <lt-modal (close)="showSettings.set(false)">
        <lt-tower-settings
          [tower]="tower()"
          (save)="onTowerSave($event)"
          (delete)="onTowerDelete()"
          (close)="showSettings.set(false)"
        />
      </lt-modal>
    }
  `,
  styles: `
    @import '../../../library/main';

    :host {
      display: block;
      cursor: pointer;
      min-height: 0;

      &.cdk-drag-animating {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }

      &.cdk-drag-placeholder {
        opacity: 0;
      }

      &:hover {
        @media (min-width: $mobile-width) {
          div.container {
            box-shadow: $shadow;
          }
        }
      }

      &.cdk-drag-preview {
        div.container {
          @media (max-width: $mobile-width) {
            @keyframes shadow {
              from { box-shadow: none; }
              to   { box-shadow: $shadow; }
            }
            animation: shadow $long-animation-time forwards;
          }
        }
      }

      &.trash-highlight {
        .container {
          transform: scale(0.75);
          position: relative;

          &::before {
            opacity: 0.5 !important;
          }
        }

        .tower-header {
          display: none;
        }
      }

      .tower {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        max-width: 100%;
        height: 100%;
        min-height: 0;

        @include inner-spacing(var(--small-padding));

        .container {
          display: flex;
          flex-direction: column;
          flex: 1 1 auto;
          margin-bottom: 0;
          min-height: 0;
          position: relative;
          box-sizing: border-box;
          container-type: inline-size;
          --block-stack-height: 0px;
          --add-block-size: 48px;
          --add-block-clearance: var(--medium-padding);
          --add-block-center-offset: 0px;

          @include card();
          overflow: hidden;
          transition: transform $short-animation-time, box-shadow $long-animation-time;

          @include inner-spacing(var(--medium-padding));

          @media (max-width: $mobile-width) {
            @include inner-spacing(var(--small-padding));
            padding: 0;
            --add-block-size: 32px;
            --add-block-clearance: var(--small-padding);
          }

          width: 100%;

          &::before {
            content: '';
            pointer-events: none;
            position: absolute;
            z-index: 2;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: red;
            opacity: 0;
            border-radius: var(--border-radius);
            transition: opacity $short-animation-time;
          }

          lt-tasks {
            flex: 0 1 auto;
            min-height: 56px;
            max-height: min(30vh, 45%);
            overflow: auto;
            display: block;
            width: 100%;

            @media (max-width: $mobile-width) {
              min-height: 44px;
              max-height: min(25vh, 45%);
            }

            .container {
              max-height: 100%;
              overflow-y: auto;
            }
          }

          .stack-zone {
            position: relative;
            flex: 1 1 auto;
            min-height: 0;
            width: 100%;

            img {
              position: relative;
              z-index: 2;
              height: 48px;

              @media (max-width: $mobile-width) {
                height: 32px;
              }

              opacity: 0.33;
              transition: opacity $long-animation-time;
              cursor: pointer;

              &:hover {
                opacity: 1;
              }
            }

            img.add-block {
              position: absolute;
              z-index: 3;
              left: 50%;
              top: max(
                0px,
                min(
                  calc(50% - var(--add-block-size) / 2 - var(--add-block-center-offset)),
                  calc(100% - var(--block-stack-height) - var(--add-block-clearance) - var(--add-block-size))
                )
              );
              transform: translateX(-50%);
            }

            .block-container-container {
              position: absolute;
              inset: 0;

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

                /* Default resting position for all blocks before JS sets them */
                * {
                  transform: translateY(500%);
                }

                .descend {
                  transition: transform 1.5s cubic-bezier(0.5, 0, 1, 0),
                              opacity 500ms cubic-bezier(0.5, 0, 1, 0);
                }

                .ascend {
                  transition: transform 1.5s cubic-bezier(0.5, 0, 1, 0),
                              opacity 500ms cubic-bezier(0.5, 0, 1, 0) 1s;
                }
              }
            }
          }
        }

        .more-blocks {
          @include small-text();
          position: absolute;
          top: calc(100% + var(--small-padding));
          left: 0;
          right: 0;
          margin: 0;
          line-height: 1;
          color: rgba($text-color, 0.72);
          text-align: center;
          pointer-events: none;
          user-select: none;
        }

        .tower-header {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;

          input[type='text'] {
            box-sizing: border-box;
            min-width: 0;
            font-size: var(--small-font-size);
            text-align: center;

            /* Truncate long titles with an ellipsis instead of wrapping. */
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;

            /* Reserve a symmetric gutter on each side. The right one keeps the
               title and its focus underline clear of the absolutely-positioned
               pen (so the underline stops before it); the equal left one keeps
               the centered title optically centered. (pen 22px + 4px gap.) */
            width: calc(100% - 52px);

            @media (max-width: $mobile-width) {
              width: calc(100% - 60px);
            }
          }

          .edit-tower {
            all: unset;
            position: absolute;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            box-sizing: border-box;
            width: 22px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: var(--border-radius);
            cursor: pointer;
            opacity: 0.35;
            transition: opacity $short-animation-time, box-shadow $long-animation-time, background-color $short-animation-time;

            /* Suppress the global button's animated hover underline
               (button::after), which the 'all: unset' reset doesn't reach. */
            &:after {
              content: none;
            }

            img {
              width: 13px;
              height: 13px;
              opacity: 1;
            }

            &:hover,
            &:focus-visible {
              opacity: 1;
              background-color: rgba($light-color, 0.86);
              box-shadow: $shadow-border;
            }

            @media (max-width: $mobile-width) {
              width: 26px;
              height: 26px;
              opacity: 0.55;
            }
          }
        }
      }
    }
  `,
})
export class TowerComponent implements AfterViewInit, OnDestroy {
  // ── Inputs ─────────────────────────────────────────────────────────────────
  readonly tower = input.required<Tower>();
  /** Optional date range filter — when set, blocks with `created_at`
   *  outside [from, to] are hidden from the falling stack. */
  readonly dateRange = input<{ from: number; to: number } | null>(null);
  /** When true, the tasks accordion starts expanded on load. */
  readonly keepTasksOpen = input<boolean>(false);
  /** When true, completed blocks descend on this tower's first measured render. */
  readonly animateInitialStack = input<boolean>(false);

  // ── Outputs ────────────────────────────────────────────────────────────────
  readonly updateTower = output<TowerSettingsResult>();
  readonly deleteTowerRequest = output<void>();
  /** Emitted when a new block is created from the carousel's "Create now" card. */
  readonly addBlock = output<{ tag: string; description: string; is_done: boolean; difficulty: number }>();
  /** Emitted when an existing block is patched from the carousel. */
  readonly saveBlock = output<{
    blockId: string;
    result: { tag: string; description: string; is_done: boolean; difficulty: number };
  }>();
  readonly deleteBlock = output<string>();

  // ── UI state ───────────────────────────────────────────────────────────────
  /** The single source of truth for "block-edit modal open" — encodes both
   *  which list of blocks to show and which one to focus initially. */
  readonly editEntry = signal<EditEntry | null>(null);
  readonly showSettings = signal(false);
  readonly hiddenBlockCount = signal(0);
  readonly hoveredBlockId = signal<string | null>(null);

  private readonly stackZone = viewChild<ElementRef<HTMLElement>>('stackZone');
  private readonly towerRoot = viewChild<ElementRef<HTMLElement>>('towerRoot');
  private readonly maxVisibleBlocks = signal<number | null>(null);
  private resizeObserver: ResizeObserver | null = null;
  private destroyed = false;
  private readonly animationFrames = new Set<number>();

  // ── Derived ────────────────────────────────────────────────────────────────
  /** Pending (not-done) blocks — fed to the tasks accordion. */
  readonly pending = computed(() => this.tower().blocks.filter((b) => !b.is_done));

  /** CSS color string for the tower name input. */
  readonly towerNameCss = computed(() => toCss(this.tower().base_color));

  /** Filtered list passed to the block-edit carousel. */
  readonly filteredForEntry = computed(() => {
    const entry = this.editEntry();
    if (!entry) return [];
    const isDone = entry.filter === 'done';
    return this.tower().blocks.filter((b) => b.is_done === isDone);
  });

  readonly editViewTitle = computed(() => {
    const entry = this.editEntry();
    if (!entry) return '';
    const prefix = entry.filter === 'done' ? 'Completed tasks' : 'Tasks';
    return `${prefix} of ${this.tower().name}`;
  });

  /** Unique tags from existing blocks of this tower. */
  readonly towerTags = computed(() => {
    const set = new Set<string>();
    for (const b of this.tower().blocks) if (b.tag) set.add(b.tag);
    return [...set];
  });

  // ── Falling animation ──────────────────────────────────────────────────────
  // Same approach as the legacy: detect "exactly one done block was added"
  // and snap that last block to translateY(500%)/opacity:0, then on next
  // tick flip it back to translateY(0)/opacity:1 with .descend so the
  // 1.5s gravity transition fires.

  private readonly _visibleBlocks = signal<StyledBlock[]>([]);
  readonly visibleBlocks = this._visibleBlocks.asReadonly();

  /** Flat list of squares to render: each visible block expands into
   *  `difficulty` adjacent squares that wrap (via the flex container) into
   *  the row above. All squares of a block share its animation state. */
  readonly squares = computed<RenderSquare[]>(() => {
    const out: RenderSquare[] = [];
    for (const b of this.visibleBlocks()) {
      const n = squareCount(b);
      for (let k = 0; k < n; k++) {
        out.push({ key: `${b.id}#${k}`, block: b });
      }
    }
    return out;
  });

  readonly blockStackHeight = computed(() => {
    const rows = Math.ceil(this.squares().length / BLOCKS_PER_ROW);
    const cqw = rows * (100 / BLOCKS_PER_ROW);
    return rows === 0 ? '0px' : `${Number(cqw.toFixed(4))}cqw`;
  });

  private prevDoneIds: string[] = [];
  private isFirstRun = true;

  constructor() {
    effect(() => {
      const range = this.dateRange();
      const maxVisibleBlocks = this.maxVisibleBlocks();
      const animateInitialStack = this.animateInitialStack();
      // Reconcile all done blocks, then cap the rendered stack to the rows
      // that fit below the tasks and add button.
      const allDone = this.tower().blocks.filter((b) => b.is_done);
      untracked(() => this.reconcile(allDone, range, maxVisibleBlocks, animateInitialStack));
    });
  }

  ngAfterViewInit(): void {
    const stackZone = this.stackZone()?.nativeElement;
    if (!stackZone) return;

    this.measureBlockCapacity();

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.measureBlockCapacity());
      this.resizeObserver.observe(stackZone);
    }

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => this.measureBlockCapacity());
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    for (const id of this.animationFrames) cancelAnimationFrame(id);
    this.animationFrames.clear();
    this.resizeObserver?.disconnect();
  }

  private measureBlockCapacity(): void {
    const stackZone = this.stackZone()?.nativeElement;
    if (!stackZone) return;

    const width = stackZone.clientWidth;
    const height = stackZone.clientHeight;
    if (width <= 0 || height <= 0) {
      this.maxVisibleBlocks.set(0);
      return;
    }

    const styles = getComputedStyle(stackZone);
    const addBlockSize = this.parseCssPixels(styles.getPropertyValue('--add-block-size'), 48);
    this.measureAddBlockCenterOffset(stackZone);
    const fallbackClearance = addBlockSize <= 32 ? 7.5 : 15;
    const clearance = this.parseCssPixels(
      styles.getPropertyValue('--add-block-clearance'),
      fallbackClearance,
    );

    const rowHeight = width / BLOCKS_PER_ROW;
    const availableHeight = Math.max(0, height - addBlockSize - 2 * clearance);
    const rows = Math.floor((availableHeight + 0.5) / rowHeight);
    this.maxVisibleBlocks.set(Math.max(0, rows) * BLOCKS_PER_ROW);
  }

  private measureAddBlockCenterOffset(stackZone: HTMLElement): void {
    const towerRoot = this.towerRoot()?.nativeElement;
    if (!towerRoot) return;

    const stackRect = stackZone.getBoundingClientRect();
    const towerRect = towerRoot.getBoundingClientRect();
    const stackCenter = stackRect.top + stackRect.height / 2;
    const towerCenter = towerRect.top + towerRect.height / 2;
    const offset = Math.max(0, stackCenter - towerCenter);
    stackZone.style.setProperty('--add-block-center-offset', `${offset}px`);
  }

  private parseCssPixels(value: string, fallback: number): number {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private reconcile(
    allDone: Block[],
    range: { from: number; to: number } | null,
    maxVisibleBlocks: number | null,
    animateInitialStack: boolean,
  ): void {
    if (this.isFirstRun && animateInitialStack && maxVisibleBlocks === null) {
      this._visibleBlocks.set([]);
      this.hiddenBlockCount.set(0);
      this.prevDoneIds = allDone.map((b) => b.id);
      this.isFirstRun = false;
      return;
    }

    const ids = allDone.map((b) => b.id);
    const prev = this.prevDoneIds;
    const prevSet = new Set(prev);
    const newIds = ids.filter((id) => !prevSet.has(id));
    const grewByOne =
      !this.isFirstRun &&
      ids.length === prev.length + 1 &&
      newIds.length === 1 &&
      prev.every((id) => ids.includes(id)); // no IDs disappeared

    const styled: StyledBlock[] = [];
    for (const b of allDone) {
      if (range && b.created_at < range.from) {
        // Below min-thumb boundary → drop entirely (instant shuffle, no animation).
        continue;
      }
      if (range && b.created_at > range.to) {
        // Above max-thumb boundary → fly up off the tower with gravity animation.
        styled.push({
          ...b,
          _anim: 'ascend',
          _transform: 'translateY(500%)',
          _opacity: '0',
        });
        continue;
      }
      // In range — descend into position (or appear instantly on first run).
      styled.push({
        ...b,
        _anim: this.isFirstRun ? '' : 'descend',
        _transform: 'translateY(0)',
        _opacity: '1',
      });
    }

    const newInRangeId = grewByOne ? newIds[0] : null;
    // Captured before any `_visibleBlocks.set` below — lets the cap keep
    // currently-shown blocks that are now flying out so their exit animates.
    const prevVisibleIds = new Set(this._visibleBlocks().map((b) => b.id));
    const visibleLimit =
      maxVisibleBlocks === null ? Number.POSITIVE_INFINITY : Math.max(0, maxVisibleBlocks);
    let visibleStyled = styled;
    let hiddenCount = 0;
    if (Number.isFinite(visibleLimit)) {
      ({ visibleStyled, hiddenCount } = selectVisibleStyledBlocks(
        styled,
        visibleLimit,
        newInRangeId,
        prevVisibleIds,
      ));
    }
    this.hiddenBlockCount.set(hiddenCount);

    if (this.isFirstRun && animateInitialStack) {
      const initialBlocks = visibleStyled.filter((b) => b._opacity === '1');
      if (initialBlocks.length > 0) {
        this.startDescendAnimation(visibleStyled, initialBlocks);
        this.prevDoneIds = ids;
        this.isFirstRun = false;
        return;
      }
    }

    if (grewByOne) {
      const newId = newIds[0];
      const newBlock = visibleStyled.find((b) => b.id === newId);
      if (newBlock) {
        // Snap newly-added in-range block to start position, then on the next
        // paint flip it back to rest — that's what makes it visibly fall.
        this.startDescendAnimation(visibleStyled, [newBlock]);
        this.prevDoneIds = ids;
        this.isFirstRun = false;
        return;
      }
    }
    // existing fall-through path (no growth, first run, or new block out of range):
    this._visibleBlocks.set(visibleStyled);

    this.prevDoneIds = ids;
    this.isFirstRun = false;
  }

  private startDescendAnimation(visibleStyled: StyledBlock[], blocks: StyledBlock[]): void {
    for (const block of blocks) {
      block._anim = '';
      block._transform = 'translateY(500%)';
      block._opacity = '0';
    }
    this._visibleBlocks.set(visibleStyled);
    this.requestFrame(() => {
      this.requestFrame(() => {
        if (this.destroyed) return;
        this.finishDescendAnimation(blocks);
      });
    });
  }

  private requestFrame(callback: () => void): void {
    if (typeof requestAnimationFrame !== 'function') {
      callback();
      return;
    }
    const id = requestAnimationFrame(() => {
      this.animationFrames.delete(id);
      if (!this.destroyed) callback();
    });
    this.animationFrames.add(id);
  }

  private finishDescendAnimation(blocks: StyledBlock[]): void {
    for (const block of blocks) {
      block._anim = 'descend';
      block._transform = 'translateY(0)';
      block._opacity = '1';
    }
    this._visibleBlocks.set([...this._visibleBlocks()]);
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  onRename(event: Event): void {
    const input = event.target as HTMLInputElement;
    const newName = input.value.trim();
    if (!newName) {
      input.value = this.tower().name;
      return;
    }
    if (newName !== this.tower().name) {
      this.updateTower.emit({ name: newName, base_color: this.tower().base_color });
    } else {
      input.value = this.tower().name;
    }
  }

  onEditBlock(block: Block): void {
    this.hoveredBlockId.set(null);
    this.editEntry.set({ filter: block.is_done ? 'done' : 'pending', activeId: block.id });
  }

  onBlockPointerEnter(blockId: string): void {
    this.hoveredBlockId.set(blockId);
  }

  onBlockPointerLeave(blockId: string, event: PointerEvent): void {
    if (this.relatedTargetBelongsToBlock(event.relatedTarget, blockId)) return;
    if (this.hoveredBlockId() === blockId) this.hoveredBlockId.set(null);
  }

  private relatedTargetBelongsToBlock(target: EventTarget | null, blockId: string): boolean {
    const towerRoot = this.towerRoot()?.nativeElement;
    let element = target instanceof Element ? target : null;

    while (element && element !== towerRoot) {
      if (element instanceof HTMLElement && element.dataset['blockId'] === blockId) return true;
      element = element.parentElement;
    }

    return false;
  }

  /** Tickbox in the tasks accordion — flip is_done to true without opening the carousel. */
  onMarkTaskDone(block: Block): void {
    this.saveBlock.emit({
      blockId: block.id,
      result: {
        tag: block.tag,
        description: block.description,
        is_done: true,
        difficulty: block.difficulty,
      },
    });
  }

  /** Called by the template "Add block" plus-icon. */
  openAddBlock(): void {
    this.editEntry.set(editEntryForNewBlock(this.keepTasksOpen()));
  }

  closeEdit(): void {
    this.editEntry.set(null);
  }

  onBlockSave(ev: BlockEditSave): void {
    if (ev.id === null) {
      this.addBlock.emit({
        tag: ev.tag,
        description: ev.description,
        is_done: ev.is_done,
        difficulty: ev.difficulty,
      });
    } else {
      this.saveBlock.emit({
        blockId: ev.id,
        result: {
          tag: ev.tag,
          description: ev.description,
          is_done: ev.is_done,
          difficulty: ev.difficulty,
        },
      });
    }
  }

  onBlockDelete(id: string): void {
    // Don't close the carousel — the deleted block disappears from `blocks()`
    // and the carousel re-renders in place. The user keeps editing siblings.
    this.deleteBlock.emit(id);
  }

  onTowerSave(result: TowerSettingsResult): void {
    // Tower edits auto-save, so this fires on every change and must NOT close
    // the modal — the user closes it via the exit button / backdrop.
    this.updateTower.emit(result);
  }

  onTowerDelete(): void {
    this.showSettings.set(false);
    this.deleteTowerRequest.emit();
  }
}
