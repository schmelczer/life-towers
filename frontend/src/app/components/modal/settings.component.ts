import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  effect,
} from '@angular/core';
import { Page } from '../../models';
import { ToggleComponent } from '../shared/toggle/toggle.component';

export interface UpdatePagePayload {
  name: string;
  hide_create_tower_button: boolean;
  keep_tasks_open: boolean;
}

const UUIDV4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Component({
  selector: 'lt-settings',
  standalone: true,
  imports: [ToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <button class="exit" type="button" (click)="close.emit()" aria-label="Close">✕</button>
      <h2>Settings</h2>

      @if (page()) {
        <section class="page-section">
          <h3>This page</h3>

          <input
            type="text"
            [value]="pageName()"
            (blur)="onRenamePage($any($event.target).value)"
            placeholder="Page name…"
            maxlength="200"
            autocomplete="off"
            aria-label="Page name"
          />

          <lt-toggle
            [checked]="hideCreateTowerButton()"
            (checkedChange)="onHideCreateTowerButtonChange($event)"
            offLabel="Show add-tower button"
            onLabel="Hide add-tower button"
          />

          <lt-toggle
            [checked]="keepTasksOpen()"
            (checkedChange)="onKeepTasksOpenChange($event)"
            offLabel="Show tasks collapsed"
            onLabel="Keep tasks open"
          />

          <button class="danger" type="button" (click)="deletePage.emit()">
            Delete this page
          </button>
        </section>

        <hr />
      }

      <section class="account-section">
        <h3>Account</h3>

        <p class="hint">Your token (keep it secret — it IS your account)</p>
        <div class="token-row">
          <input
            type="text"
            readonly
            [value]="token()"
            aria-label="Your account token"
          />
          <button type="button" (click)="onCopy()">Copy</button>
        </div>

        <p class="hint">Paste a token to switch accounts</p>
        <div class="token-row">
          <input
            type="text"
            [class.error]="tokenInputTouched() && tokenInput() && !isValidToken()"
            placeholder="Paste a UUID…"
            [value]="tokenInput()"
            (input)="onTokenInput($any($event.target).value)"
            (blur)="tokenInputTouched.set(true)"
            aria-label="Paste token to switch account"
          />
          <button type="button" [disabled]="!isValidToken()" (click)="onSwitch()">
            Switch
          </button>
        </div>
        @if (tokenInputTouched() && tokenInput() && !isValidToken()) {
          <p class="error-message">Not a valid token. Must be a UUIDv4.</p>
        }
      </section>
    </div>
  `,
  styles: `
    @import '../../../library/main';

    :host {
      display: block;
    }

    .card {
      @include card();
      width: 66vw;
      max-width: 480px;
      @media (max-width: $mobile-width) { width: 300px; }
      box-sizing: border-box;
      padding: var(--large-padding);
      position: relative;
      box-shadow: $shadow;
      text-align: left;

      .exit {
        position: absolute;
        top: var(--medium-padding);
        right: var(--medium-padding);
        @include exit();
        font-size: 0;
      }

      h2 {
        margin: 0 0 var(--large-padding) 0;
        text-align: center;
      }

      h3 {
        margin: 0 0 var(--medium-padding) 0;
        font-size: var(--large-font-size);
      }

      section {
        @include inner-spacing(var(--medium-padding));
        margin-bottom: var(--large-padding);

        &:last-child {
          margin-bottom: 0;
        }
      }

      hr {
        border: 0;
        border-top: 1px solid rgba(0, 0, 0, 0.08);
        margin: var(--large-padding) 0;
      }

      .hint {
        font-size: var(--small-font-size);
        color: rgba($text-color, 0.7);
        margin: 0 0 4px 0;
      }

      .token-row {
        display: flex;
        gap: var(--small-padding);
        align-items: center;

        input {
          flex: 1;
          min-width: 0;
          text-align: left;
        }

        button {
          margin: 0;
          flex: 0 0 auto;
        }
      }

      input.error {
        box-shadow: 0 1px #b53f3f;
      }

      .error-message {
        color: #b53f3f;
        font-size: var(--small-font-size);
        margin-top: 4px;
      }

      button.danger {
        color: #b53f3f;
        border-bottom-color: #b53f3f55;

        &:after {
          background-color: #b53f3f;
        }
      }
    }
  `,
})
export class SettingsComponent {
  readonly token = input.required<string>();
  readonly page = input<Page | null>(null);

  readonly close = output<void>();
  readonly switchAccount = output<string>();
  readonly updatePage = output<UpdatePagePayload>();
  readonly deletePage = output<void>();

  // Page-settings state — seeded from page() input
  readonly pageName = signal('');
  readonly hideCreateTowerButton = signal(false);
  readonly keepTasksOpen = signal(false);

  // Token-switch state
  readonly tokenInput = signal('');
  readonly tokenInputTouched = signal(false);
  readonly isValidToken = computed(() => UUIDV4_RE.test(this.tokenInput()));

  constructor() {
    effect(() => {
      const p = this.page();
      if (p) {
        this.pageName.set(p.name);
        this.hideCreateTowerButton.set(p.hide_create_tower_button);
        this.keepTasksOpen.set(p.keep_tasks_open);
      }
    });
  }

  onRenamePage(value: string): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    this.pageName.set(trimmed);
    this.flushPageUpdate();
  }

  onHideCreateTowerButtonChange(value: boolean): void {
    this.hideCreateTowerButton.set(value);
    this.flushPageUpdate();
  }

  onKeepTasksOpenChange(value: boolean): void {
    this.keepTasksOpen.set(value);
    this.flushPageUpdate();
  }

  private flushPageUpdate(): void {
    this.updatePage.emit({
      name: this.pageName(),
      hide_create_tower_button: this.hideCreateTowerButton(),
      keep_tasks_open: this.keepTasksOpen(),
    });
  }

  onCopy(): void {
    navigator.clipboard.writeText(this.token()).catch(() => {});
  }

  onTokenInput(value: string): void {
    this.tokenInput.set(value.trim());
  }

  onSwitch(): void {
    if (!this.isValidToken()) return;
    this.switchAccount.emit(this.tokenInput());
    this.close.emit();
  }
}
