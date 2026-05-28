import { Component, ChangeDetectionStrategy, output } from '@angular/core';

@Component({
  selector: 'lt-welcome',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="welcome-card">
      <button class="exit" type="button" (click)="close.emit()" aria-label="Close">✕</button>

      <h2>Welcome to Life Towers</h2>

      <p class="lead">
        A visual TODO with bite. Each <strong>page</strong> is a context (work, hobbies, a project).
        Each <strong>tower</strong> is a stack of related tasks. As you finish a task, it falls into the
        tower as a colored square — the more you do, the taller it grows.
      </p>

      <p class="muted">
        Everything you write is saved to a small remote database, keyed to a private UUID token shown
        under <em>Settings → Account</em>. Copy that token to recover your data on another device, or
        paste a friend's token to look at theirs.
      </p>

      <div class="actions">
        <button type="button" (click)="startFresh.emit()">Start fresh</button>
        <button type="button" class="primary" (click)="loadExample.emit()">Try an example</button>
      </div>
    </div>
  `,
  styles: `
    @import '../../../library/main';

    :host { display: block; }

    .welcome-card {
      @include card();
      width: 66vw;
      max-width: 480px;
      @media (max-width: $mobile-width) { width: 300px; }
      box-sizing: border-box;
      padding: var(--large-padding);
      position: relative;
      box-shadow: $shadow;
      text-align: left;
      @include inner-spacing(var(--medium-padding));

      .exit {
        position: absolute;
        top: var(--medium-padding);
        right: var(--medium-padding);
        @include exit();
      }

      h2 {
        text-align: center;
        margin-bottom: var(--medium-padding);
      }

      p.lead { color: $text-color; }

      p.muted {
        color: rgba($text-color, 0.7);
        font-size: var(--medium-font-size);
        em { font-style: italic; }
      }

      .actions {
        display: flex;
        justify-content: space-around;
        gap: var(--large-padding);
        margin-top: var(--large-padding);

        button.primary {
          color: $accent-color;
          border-bottom-color: rgba($accent-color, 0.33);
          &:after { background-color: $accent-color; }
        }
      }
    }
  `,
})
export class WelcomeComponent {
  readonly close = output<void>();
  readonly startFresh = output<void>();
  readonly loadExample = output<void>();
}
