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

@Component({
  selector: 'lt-settings',
  standalone: true,
  imports: [ToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      @if (!requireRecovery()) {
        <button class="exit" type="button" (click)="close.emit()" aria-label="Close"></button>
      }
      <h2 id="settings-title">{{ requireRecovery() ? 'Save your recovery token' : 'Settings' }}</h2>

      @if (requireRecovery()) {
        <p class="recovery-warning" id="recovery-warning" role="alert">
          Your browser cannot remember this account. After a reload, it may open a different,
          empty account. Your saved pages stay on the server, but you need this recovery token
          to access them again. Save it somewhere safe before continuing.
        </p>
      }

      @if (page()) {
        <section class="page-section">
          <h3>This page</h3>

          <input
            type="text"
            [value]="pageName()"
            (blur)="onRenamePage($any($event.target))"
            placeholder="Page name…"
            maxlength="200"
            autocomplete="off"
            aria-label="Page name"
          />

          <div class="toggle-list">
            <lt-toggle
              class="setting-toggle"
              [checked]="hideCreateTowerButton()"
              (checkedChange)="onHideCreateTowerButtonChange($event)"
              offLabel="Show add-tower button"
              onLabel="Hide add-tower button"
            />

            <lt-toggle
              class="setting-toggle"
              [checked]="keepTasksOpen()"
              (checkedChange)="onKeepTasksOpenChange($event)"
              offLabel="Show tasks collapsed"
              onLabel="Keep tasks open"
            />
          </div>

          <button class="danger" type="button" (click)="deletePage.emit()">
            Delete this page
          </button>
        </section>

        <hr />
      }

      <section class="account-section">
        <h3>Account</h3>

        <p class="hint">
          Keep this token somewhere safe to reopen your account after a reload or on another device.
        </p>
        <div class="token-row">
          <input
            type="text"
            readonly
            [value]="token()"
            aria-label="Your account token"
          />
          <button type="button" (click)="onCopy()">Copy</button>
        </div>
        @if (copyStatus() === 'copied') {
          <p class="hint" role="status">Token copied. Keep a copy somewhere safe.</p>
        } @else if (copyStatus() === 'error') {
          <p class="hint" role="alert">
            Could not copy automatically. Select the token above and copy it manually.
          </p>
        }

        @if (requireRecovery()) {
          <label class="recovery-confirmation">
            <input
              type="checkbox"
              [checked]="recoveryConfirmed()"
              (change)="recoveryConfirmed.set($any($event.target).checked)"
            />
            I have saved this recovery token somewhere I can find after a reload.
          </label>
          <button
            type="button"
            [disabled]="!recoveryConfirmed()"
            (click)="onAcknowledgeRecovery()"
          >Continue saving</button>
        }

        <p class="hint">
          {{ requireRecovery() ? 'Already have a recovery token? Paste it to reopen that account.' : 'Paste a token to switch accounts' }}
        </p>
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
      @media (max-width: $mobile-width) {
        width: 88vw;
        max-width: 88vw;
        padding: var(--medium-padding);
      }
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
      }

      h2 {
        margin: 0 0 var(--large-padding) 0;
        padding: 0 36px;
        line-height: 1.3;
        text-align: center;
      }

      h3 {
        margin: 0 0 var(--medium-padding) 0;
        font-size: var(--medium-font-size);
        line-height: 1.35;
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

      input[type='text'],
      button:not(.exit) {
        font-size: var(--medium-font-size);
        line-height: 1.35;
      }

      .toggle-list {
        display: flex;
        flex-direction: column;
        gap: var(--small-padding);
      }

      lt-toggle.setting-toggle {
        --toggle-label-width: 145px;

        box-sizing: border-box;
        justify-content: center;
        width: 100%;
        min-height: 52px;
        padding: var(--small-padding);
        border-radius: var(--border-radius);
        background: rgba($text-color, 0.035);

        @media (max-width: $mobile-width) {
          min-height: 48px;
        }
      }

      .hint {
        font-size: var(--medium-font-size);
        line-height: 1.35;
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
          max-width: 100%;
        }

        @media (max-width: $mobile-width) {
          flex-wrap: wrap;
          input { width: 100%; }
          button { margin-left: auto; }
        }
      }

      .recovery-confirmation {
        @include medium-text();
        display: flex;
        align-items: flex-start;
        gap: var(--small-padding);
        line-height: 1.35;
      }

      .recovery-warning {
        font-size: var(--medium-font-size);
        line-height: 1.45;
        margin: 0 0 var(--large-padding);
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
  readonly requireRecovery = input(false);
  readonly page = input<Page | null>(null);

  readonly close = output<void>();
  readonly switchAccount = output<string>();
  readonly recoveryAcknowledged = output<string>();
  readonly updatePage = output<UpdatePagePayload>();
  readonly deletePage = output<void>();

  // Page-settings state — seeded from page() input
  readonly pageName = signal('');
  readonly hideCreateTowerButton = signal(false);
  readonly keepTasksOpen = signal(false);

  private static readonly UUIDV4_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  // Token-switch state
  readonly tokenInput = signal('');
  readonly tokenInputTouched = signal(false);
  readonly copyStatus = signal<'idle' | 'copied' | 'error'>('idle');
  readonly recoveryConfirmed = signal(false);
  readonly isValidToken = computed(() =>
    SettingsComponent.UUIDV4_RE.test(this.tokenInput()),
  );

  constructor() {
    effect(() => {
      this.token();
      this.copyStatus.set('idle');
      this.recoveryConfirmed.set(false);
    });
    effect(() => {
      const p = this.page();
      if (p) {
        this.pageName.set(p.name);
        this.hideCreateTowerButton.set(p.hide_create_tower_button);
        this.keepTasksOpen.set(p.keep_tasks_open);
      }
    });
  }

  onRenamePage(input: HTMLInputElement): void {
    const trimmed = input.value.trim();
    if (!trimmed) {
      input.value = this.pageName();
      return;
    }
    this.pageName.set(trimmed);
    input.value = trimmed;
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

  async onCopy(): Promise<void> {
    const token = this.token();
    try {
      await navigator.clipboard.writeText(token);
      if (this.token() === token) this.copyStatus.set('copied');
    } catch {
      if (this.token() === token) this.copyStatus.set('error');
    }
  }

  onAcknowledgeRecovery(): void {
    if (this.requireRecovery() && this.recoveryConfirmed()) {
      this.recoveryAcknowledged.emit(this.token());
    }
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
