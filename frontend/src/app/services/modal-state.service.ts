import { Injectable, computed, signal } from '@angular/core';

/**
 * Shared counter of currently-open modals. Each `lt-modal` increments on
 * mount and decrements on destroy. Consumers read `anyOpen` to react.
 *
 * Used by `page.component` to disable tower drag-and-drop while any modal
 * (block-edit carousel, page-settings, tower-settings, confirm-delete,
 * settings) is on screen — otherwise the user can drag towers from behind
 * the open card.
 */
@Injectable({ providedIn: 'root' })
export class ModalStateService {
  private readonly _openCount = signal(0);

  readonly anyOpen = computed(() => this._openCount() > 0);

  open(): void {
    this._openCount.update((n) => n + 1);
  }

  close(): void {
    this._openCount.update((n) => Math.max(0, n - 1));
  }
}
