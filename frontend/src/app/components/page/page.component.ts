import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
  HostListener,
  effect,
  untracked,
} from '@angular/core';
import { Page } from '../../models';
import { StoreService } from '../../services/store.service';
import { TowerComponent } from '../tower/tower.component';
import { ModalComponent } from '../modal/modal.component';
import { TowerSettingsComponent, TowerSettingsResult } from '../modal/tower-settings.component';
import {
  DoubleSliderComponent,
  DoubleSliderRange,
} from '../shared/double-slider/double-slider.component';
import { CdkDropList, CdkDrag, CdkDragDrop } from '@angular/cdk/drag-drop';
import { ModalStateService } from '../../services/modal-state.service';

// ── Relative-time helpers ──────────────────────────────────────────────────

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' });

function formatRelative(ts: number, nowSec: number): string {
  const diff = ts - nowSec; // negative = past
  const absDiff = Math.abs(diff);
  if (absDiff < 45) return rtf.format(Math.round(diff), 'second');
  if (absDiff < 60 * 45) return rtf.format(Math.round(diff / 60), 'minute');
  if (absDiff < 60 * 60 * 22) return rtf.format(Math.round(diff / 3600), 'hour');
  if (absDiff < 86400 * 26) return rtf.format(Math.round(diff / 86400), 'day');
  if (absDiff < 86400 * 320) return rtf.format(Math.round(diff / 86400 / 30), 'month');
  return rtf.format(Math.round(diff / 86400 / 365), 'year');
}

interface BlockPatch {
  tag: string;
  description: string;
  is_done: boolean;
  difficulty: number;
}

/** Minimum blocks before the date-range slider becomes visible. */
const MIN_BLOCKS_FOR_SLIDER = 2;

@Component({
  selector: 'lt-page',
  standalone: true,
  imports: [
    TowerComponent,
    ModalComponent,
    TowerSettingsComponent,
    DoubleSliderComponent,
    CdkDropList,
    CdkDrag,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page.component.html',
  styleUrl: './page.component.scss',
})
export class PageComponent {
  readonly page = input.required<Page>();
  readonly animateInitialStack = input<boolean>(false);
  readonly dragHappening = output<boolean>();

  protected readonly store = inject(StoreService);
  private readonly modalState = inject(ModalStateService);
  /** True while any lt-modal is mounted — used to lock tower drag. */
  readonly modalOpen = this.modalState.anyOpen;
  readonly mobileDragDisabled = signal(this.isMobileViewport());

  readonly showAddTower = signal(false);
  readonly isDragging = signal(false);
  /** When set, opens a confirmation modal before the dragged tower is deleted. */
  readonly confirmDeleteTowerId = signal<string | null>(null);
  private draggedTowerId: string | null = null;
  private nearTrashcan = false;

  readonly confirmDeleteTowerName = computed(() => {
    const id = this.confirmDeleteTowerId();
    if (!id) return '';
    return this.page().towers.find((t) => t.id === id)?.name ?? '';
  });

  // ── Date-range slider state ────────────────────────────────────────────────

  /** Sorted unique `created_at` timestamps (seconds) across all done blocks
   *  in this page. Empty list when no blocks yet. */
  readonly blockDates = computed<number[]>(() => {
    const set = new Set<number>();
    for (const tower of this.page().towers) {
      for (const b of tower.blocks) if (b.is_done) set.add(b.created_at);
    }
    return [...set].sort((a, b) => a - b);
  });

  /** Date labels formatted for slider display (deduplicated, insertion order). */
  readonly dateLabels = computed<string[]>(() => {
    const now = Math.floor(Date.now() / 1000);
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const t of this.blockDates()) {
      const lbl = formatRelative(t, now);
      if (!seen.has(lbl)) {
        seen.add(lbl);
        labels.push(lbl);
      }
    }
    return labels;
  });

  readonly showSlider = computed(() => this.blockDates().length >= MIN_BLOCKS_FOR_SLIDER);

  /** Selected date range — `null` = show everything. */
  readonly dateRange = signal<{ from: number; to: number } | null>(null);

  constructor() {
    effect(() => {
      if (!this.showSlider()) {
        untracked(() => this.dateRange.set(null));
      }
    });
  }

  onSliderRangeChange(range: DoubleSliderRange<unknown>): void {
    this.dateRange.set({ from: range.from as number, to: range.to as number });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.mobileDragDisabled.set(this.isMobileViewport());
  }

  private isMobileViewport(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 520px), (pointer: coarse)').matches
    );
  }

  // ── Tower mutations ────────────────────────────────────────────────────────

  onAddTower(result: TowerSettingsResult): void {
    this.showAddTower.set(false);
    this.store.addTower(this.page().id, result.name, result.base_color);
  }

  onUpdateTower(towerId: string, result: TowerSettingsResult): void {
    this.store.updateTower(this.page().id, towerId, {
      name: result.name,
      base_color: result.base_color,
    });
  }

  onDeleteTower(towerId: string): void {
    this.confirmDeleteTowerId.set(towerId);
  }

  // ── Block mutations ────────────────────────────────────────────────────────

  onAddBlock(towerId: string, result: BlockPatch): void {
    this.store.addBlock(
      this.page().id,
      towerId,
      result.tag,
      result.description,
      result.is_done,
      result.difficulty,
    );
  }

  onSaveBlock(towerId: string, event: { blockId: string; result: BlockPatch }): void {
    this.store.updateBlock(this.page().id, towerId, event.blockId, event.result);
  }

  onDeleteBlock(towerId: string, blockId: string): void {
    this.store.deleteBlock(this.page().id, towerId, blockId);
  }

  // ── Drag-and-drop + trash ──────────────────────────────────────────────────

  onTowerDragStart(towerId: string): void {
    this.draggedTowerId = towerId;
    this.isDragging.set(true);
    this.dragHappening.emit(true);
  }

  onTowerDropped(event: CdkDragDrop<unknown>): void {
    this.isDragging.set(false);
    this.dragHappening.emit(false);
    if (this.nearTrashcan && this.draggedTowerId) {
      // Open confirm dialog instead of deleting immediately.
      this.confirmDeleteTowerId.set(this.draggedTowerId);
    } else if (event.previousIndex !== event.currentIndex) {
      this.store.reorderTowers(this.page().id, event.previousIndex, event.currentIndex);
    }
    this.draggedTowerId = null;
    this.nearTrashcan = false;
  }

  confirmTowerDelete(): void {
    const id = this.confirmDeleteTowerId();
    if (id) this.store.deleteTower(this.page().id, id);
    this.confirmDeleteTowerId.set(null);
  }

  cancelTowerDelete(): void {
    this.confirmDeleteTowerId.set(null);
  }

  onTrashEnter(): void {
    this.nearTrashcan = true;
    this.dragPreview()?.classList.add('trash-highlight');
  }

  onTrashLeave(): void {
    this.nearTrashcan = false;
    this.dragPreview()?.classList.remove('trash-highlight');
  }

  /** The CDK drag preview currently in flight, if any. Matches legacy DOM-driven trash highlight. */
  private dragPreview(): Element | null {
    return document.querySelector('.cdk-drag-preview');
  }
}
