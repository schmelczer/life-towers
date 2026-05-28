import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
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
export class PagesComponent {
  protected readonly store = inject(StoreService);

  /** ID of currently selected page within store.pages(). */
  private readonly selectedPageId = signal<string | null>(null);

  readonly showSettings = signal(false);
  readonly dragHappening = signal(false);
  readonly showWelcome = signal(false);

  constructor() {
    effect(() => {
      if (!this.store.loading() && this.store.pages().length === 0) {
        this.showWelcome.set(true);
      } else if (this.store.pages().length > 0) {
        this.showWelcome.set(false);
      }
    });
  }

  onLoadExample(): void {
    this.store.loadExample();
    this.showWelcome.set(false);
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

  readonly selectedPageName = computed(() => this.selectedPage()?.name ?? null);

  readonly selectedPageIndex = computed(() => {
    const page = this.selectedPage();
    if (!page) return -1;
    return this.store.pages().findIndex((p) => p.id === page.id);
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

  onRemovePage(): void {
    const page = this.selectedPage();
    if (!page) return;
    this.store.deletePage(page.id);
    this.selectedPageId.set(null);
    this.showSettings.set(false);
  }

  onSwitchAccount(token: string): void {
    this.store.switchToken(token);
  }
}
