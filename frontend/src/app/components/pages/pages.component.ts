import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
  OnDestroy,
} from '@angular/core';
import { StoreService } from '../../services/store.service';
import { PageComponent } from '../page/page.component';
import { ModalComponent } from '../modal/modal.component';
import { SettingsComponent, UpdatePagePayload } from '../modal/settings.component';
import { SelectAddComponent } from '../shared/select-add/select-add.component';
import { WelcomeComponent } from '../welcome/welcome.component';
import { Page } from '../../models';

@Component({
  selector: 'lt-pages',
  standalone: true,
  imports: [PageComponent, ModalComponent, SettingsComponent, SelectAddComponent, WelcomeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pages.component.html',
  styleUrl: './pages.component.scss',
})
export class PagesComponent implements OnDestroy {
  protected readonly store = inject(StoreService);

  /** ID of currently selected page within store.pages(). */
  private readonly selectedPageId = signal<string | null>(null);

  readonly showSettings = signal(false);
  readonly dragHappening = signal(false);
  readonly showWelcome = signal(false);
  readonly confirmDeletePageId = signal<string | null>(null);
  readonly animateInitialStackPageId = signal<string | null>(null);
  private exampleAnimationTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const pages = this.store.pages();
      if (!this.store.loading() && pages.length === 0) {
        this.showWelcome.set(true);
      } else if (pages.length > 0) {
        this.showWelcome.set(false);
      }
    });
  }

  onLoadExample(): void {
    const pageId = this.store.loadExample();
    this.selectedPageId.set(pageId);
    this.animateInitialStackPageId.set(pageId);
    if (this.exampleAnimationTimer !== null) {
      clearTimeout(this.exampleAnimationTimer);
    }
    this.exampleAnimationTimer = setTimeout(() => {
      if (this.animateInitialStackPageId() === pageId) {
        this.animateInitialStackPageId.set(null);
      }
      this.exampleAnimationTimer = null;
    }, 2500);
    this.showWelcome.set(false);
  }

  ngOnDestroy(): void {
    if (this.exampleAnimationTimer !== null) {
      clearTimeout(this.exampleAnimationTimer);
    }
  }

  readonly pageNames = computed(() => this.store.pages().map((p) => p.name));

  readonly selectedPage = computed<Page | null>(() => {
    const pages = this.store.pages();
    if (pages.length === 0) return null;
    const id = this.selectedPageId();
    if (id) {
      const found = pages.find((p) => p.id === id);
      if (found) return found;
    }
    // Default to first page.
    return pages[0] ?? null;
  });

  /**
   * The selected page as a 0-or-1 element list, so the template's
   * `@for (… track page.id)` REBUILDS the `lt-page` subtree when the page *id*
   * changes (navigation) but REUSES it on same-page edits (id unchanged).
   *
   * Recreating on navigation gives each page a fresh date-range slider + filter,
   * exactly like a page reload. Without it, `lt-page` (and its slider) are reused
   * across pages, so the previous page's stale `dateRange` is applied to the new
   * page's towers on their very first render. When the new page's blocks fall
   * outside that stale range they render out-of-range (ascending, off-screen) and
   * then visibly "fall" into place a frame later when the slider corrects the
   * range — the bug this guards against.
   */
  readonly selectedPageList = computed<Page[]>(() => {
    const page = this.selectedPage();
    return page ? [page] : [];
  });

  readonly confirmDeletePageName = computed(() => {
    const id = this.confirmDeletePageId();
    if (!id) return '';
    return this.store.pages().find((p) => p.id === id)?.name ?? '';
  });

  readonly selectedPageIndex = computed(() => {
    const pages = this.store.pages();
    const page = this.selectedPage();
    if (!page) return -1;
    return pages.findIndex((p) => p.id === page.id);
  });

  onSelectPage(index: number): void {
    const pages = this.store.pages();
    const page = pages[index];
    if (page) {
      this.selectedPageId.set(page.id);
    }
  }

  onAddPage(name: string): void {
    this.store.addPage(name);
    // Select the newly added page.
    const pages = this.store.pages();
    const newPage = pages[pages.length - 1];
    if (newPage) {
      this.selectedPageId.set(newPage.id);
    }
  }

  onUpdatePage(payload: UpdatePagePayload): void {
    const page = this.selectedPage();
    if (page) {
      this.store.updatePage(page.id, payload);
    }
  }

  onRequestRemovePage(): void {
    const page = this.selectedPage();
    if (!page) return;
    this.confirmDeletePageId.set(page.id);
  }

  confirmRemovePage(): void {
    const pageId = this.confirmDeletePageId();
    if (!pageId) return;
    this.store.deletePage(pageId);
    this.selectedPageId.set(null);
    this.showSettings.set(false);
    this.confirmDeletePageId.set(null);
  }

  cancelRemovePage(): void {
    this.confirmDeletePageId.set(null);
  }

  onSwitchAccount(token: string): void {
    this.store.switchToken(token);
  }
}
