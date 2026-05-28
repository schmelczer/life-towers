import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  effect,
  untracked,
} from '@angular/core';
import { Tower, Block } from '../../models';
import { BlockComponent } from '../block/block.component';
import { TasksComponent } from '../tasks/tasks.component';
import { BlockEditComponent, BlockEditSave } from '../modal/block-edit.component';
import { ModalComponent } from '../modal/modal.component';
import { TowerSettingsComponent, TowerSettingsResult } from '../modal/tower-settings.component';
import { toCss } from '../../utils/color';

/** Tracks which entry path the block-edit modal was opened from. */
type EditEntry = { filter: 'done' | 'pending'; activeId: string | null };

/** A done block augmented with per-render animation state. */
interface StyledBlock extends Block {
  _anim: '' | 'descend' | 'ascend';
  _transform: string;
  _opacity: string;
}

@Component({
  selector: 'lt-tower',
  standalone: true,
  imports: [BlockComponent, TasksComponent, ModalComponent, TowerSettingsComponent, BlockEditComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tower">
      <div class="container" [class.trash-highlight]="trashHighlight()">
        <lt-tasks
          [pending]="pending()"
          [baseColor]="tower().base_color"
          [initiallyOpen]="keepTasksOpen()"
          (markDone)="onMarkTaskDone($event)"
          (edit)="onEditBlock($event)"
        />

        <img
          src="assets/plus-sign.svg"
          class="add-block"
          alt="Add block"
          (click)="$event.stopPropagation(); openAddBlock()"
        />

        <div class="block-container-container">
          <div class="block-container">
            @for (b of visibleBlocks(); track b.id) {
              <lt-block
                [block]="b"
                [baseColor]="tower().base_color"
                [class]="b._anim"
                [style.transform]="b._transform"
                [style.opacity]="b._opacity"
                (clicked)="onEditBlock(b)"
              />
            }
          </div>
        </div>
      </div>

      <input
        #nameInput
        type="text"
        [value]="tower().name"
        [style.color]="towerNameCss()"
        (blur)="onRename($event)"
        (keydown.enter)="nameInput.blur()"
      />
    </div>

    @if (editEntry(); as entry) {
      <lt-modal (close)="closeEdit()">
        <lt-block-edit
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
        <lt-tower-settings [tower]="tower()" (save)="onTowerSave($event)" (delete)="onTowerDelete()" />
      </lt-modal>
    }
  `,
  styles: `
    @import '../../../library/main';

    :host {
      cursor: pointer;

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

          :before {
            opacity: 0.5 !important;
          }
        }

        input {
          display: none;
        }
      }

      .tower {
        display: flex;
        flex-direction: column;
        align-items: center;
        max-width: 100%;
        height: 100%;

        @include inner-spacing(var(--small-padding));

        .container {
          display: flex;
          flex-direction: column;
          flex: 1 1 auto;
          position: relative;

          @include card();
          overflow: hidden;
          transition: transform $short-animation-time, box-shadow $long-animation-time;

          @include inner-spacing(var(--medium-padding));

          width: 100%;

          :before {
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
            flex: 0 0 auto;
            min-height: 56px;
            max-height: 30vh;
            overflow: hidden;
            display: block;
            width: 100%;

            .container {
              max-height: 100%;
              overflow-y: auto;
            }
          }

          img.add-block {
            flex: 0 0 auto;
            align-self: center;
            margin: var(--medium-padding) 0;
          }

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

        input[type='text'] {
          font-size: var(--small-font-size);
          text-align: center;

          @media (min-width: $mobile-width) {
            width: 50%;
          }
        }
      }
    }
  `,
})
export class TowerComponent {
  // ── Inputs ─────────────────────────────────────────────────────────────────
  readonly tower = input.required<Tower>();
  /** Set by page component when this tower is being dragged over trash. */
  readonly trashHighlight = input<boolean>(false);
  /** Optional date range filter — when set, blocks with `created_at`
   *  outside [from, to] are hidden from the falling stack. */
  readonly dateRange = input<{ from: number; to: number } | null>(null);
  /** When true, the tasks accordion starts expanded on load. */
  readonly keepTasksOpen = input<boolean>(false);

  // ── Outputs ────────────────────────────────────────────────────────────────
  readonly updateTower = output<TowerSettingsResult>();
  readonly deleteTowerRequest = output<void>();
  /** Emitted when a new block is created from the carousel's "Create now" card. */
  readonly addBlock = output<{ tag: string; description: string; is_done: boolean }>();
  /** Emitted when an existing block is patched from the carousel. */
  readonly saveBlock = output<{
    blockId: string;
    result: { tag: string; description: string; is_done: boolean };
  }>();
  readonly deleteBlock = output<string>();

  // ── UI state ───────────────────────────────────────────────────────────────
  /** The single source of truth for "block-edit modal open" — encodes both
   *  which list of blocks to show and which one to focus initially. */
  readonly editEntry = signal<EditEntry | null>(null);
  readonly showSettings = signal(false);

  // ── Derived ────────────────────────────────────────────────────────────────
  /** Pending (not-done) blocks — fed to the tasks accordion. */
  readonly pending = computed(() => this.tower().blocks.filter(b => !b.is_done));

  /** CSS color string for the tower name input. */
  readonly towerNameCss = computed(() => toCss(this.tower().base_color));

  /** Filtered list passed to the block-edit carousel. */
  readonly filteredForEntry = computed(() => {
    const entry = this.editEntry();
    if (!entry) return [];
    const isDone = entry.filter === 'done';
    return this.tower().blocks.filter(b => b.is_done === isDone);
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

  private prevDoneIds: string[] = [];
  private isFirstRun = true;

  constructor() {
    effect(() => {
      const range = this.dateRange();
      // Always keep ALL done blocks in the visible list. The date filter
      // only flips per-block `_anim` so the 1.5s ascend/descend transition
      // can animate them in and out of the falling stack.
      const allDone = this.tower().blocks.filter((b) => b.is_done);
      untracked(() => this.reconcile(allDone, range));
    });
  }

  private reconcile(allDone: Block[], range: { from: number; to: number } | null): void {
    const ids = allDone.map((b) => b.id);
    const prev = this.prevDoneIds;
    const prevSet = new Set(prev);
    const newIds = ids.filter(id => !prevSet.has(id));
    const grewByOne =
      !this.isFirstRun &&
      ids.length === prev.length + 1 &&
      newIds.length === 1 &&
      prev.every(id => ids.includes(id));   // no IDs disappeared

    const inRange = (b: Block) =>
      !range || (b.created_at >= range.from && b.created_at <= range.to);

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

    if (grewByOne) {
      const newId = newIds[0];
      const newBlock = styled.find(b => b.id === newId);
      if (newBlock && inRange(newBlock)) {
        // Snap newly-added in-range block to start position, then on the next
        // paint flip it back to rest — that's what makes it visibly fall.
        newBlock._anim = '';
        newBlock._transform = 'translateY(500%)';
        newBlock._opacity = '0';
        this._visibleBlocks.set(styled);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            newBlock._anim = 'descend';
            newBlock._transform = 'translateY(0)';
            newBlock._opacity = '1';
            this._visibleBlocks.set([...this._visibleBlocks()]);
          });
        });
        this.prevDoneIds = ids;
        this.isFirstRun = false;
        return;
      }
    }
    // existing fall-through path (no growth, first run, or new block out of range):
    this._visibleBlocks.set(styled);

    this.prevDoneIds = ids;
    this.isFirstRun = false;
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  onRename(event: Event): void {
    const input = event.target as HTMLInputElement;
    const newName = input.value.trim();
    if (newName && newName !== this.tower().name) {
      this.updateTower.emit({ name: newName, base_color: this.tower().base_color });
    }
  }

  onEditBlock(block: Block): void {
    this.editEntry.set({ filter: block.is_done ? 'done' : 'pending', activeId: block.id });
  }

  /** Tickbox in the tasks accordion — flip is_done to true without opening the carousel. */
  onMarkTaskDone(block: Block): void {
    this.saveBlock.emit({
      blockId: block.id,
      result: { tag: block.tag, description: block.description, is_done: true },
    });
  }

  /** Called by the template "Add block" plus-icon. */
  openAddBlock(): void {
    this.editEntry.set({ filter: 'done', activeId: null });
  }

  closeEdit(): void {
    this.editEntry.set(null);
  }

  onBlockSave(ev: BlockEditSave): void {
    if (ev.id === null) {
      this.addBlock.emit({ tag: ev.tag, description: ev.description, is_done: ev.is_done });
    } else {
      this.saveBlock.emit({
        blockId: ev.id,
        result: { tag: ev.tag, description: ev.description, is_done: ev.is_done },
      });
    }
  }

  onBlockDelete(id: string): void {
    // Don't close the carousel — the deleted block disappears from `blocks()`
    // and the carousel re-renders in place. The user keeps editing siblings.
    this.deleteBlock.emit(id);
  }

  onTowerSave(result: TowerSettingsResult): void {
    this.showSettings.set(false);
    this.updateTower.emit(result);
  }

  onTowerDelete(): void {
    this.showSettings.set(false);
    this.deleteTowerRequest.emit();
  }
}
