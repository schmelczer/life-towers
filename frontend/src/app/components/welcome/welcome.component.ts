import { Component, ChangeDetectionStrategy, output } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';

@Component({
  selector: 'lt-welcome',
  standalone: true,
  imports: [A11yModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="welcome-card">
      <h2 id="welcome-title" tabindex="-1" cdkFocusInitial>Welcome to Life Towers</h2>

      <button
        class="exit"
        type="button"
        (click)="close.emit()"
        aria-label="Dismiss welcome"
      ></button>

      <p class="lead" id="welcome-description">
        Life Towers turns completed tasks into visible stacks. Create pages for work, hobbies,
        home, or any project. Add towers for task groups, then check off tasks to build them
        block by block.
      </p>

      <p class="sr-only">
        Preview showing three towers with pending task bars at the top and completed task
        blocks stacked below.
      </p>
      <div class="tower-preview" aria-hidden="true">
        <div class="preview-shell">
          <div class="preview-page-tab"></div>
          <div class="preview-towers">
            <div class="preview-tower preview-tower--reading">
              <span class="preview-task"></span>
              <div class="preview-stack">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <div class="preview-tower preview-tower--projects">
              <span class="preview-task"></span>
              <span class="preview-task preview-task--short"></span>
              <div class="preview-stack">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <div class="preview-tower preview-tower--exercise">
              <span class="preview-task"></span>
              <div class="preview-stack">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h3 class="sr-only" id="welcome-basics-title">How Life Towers works</h3>
      <dl class="basics" aria-labelledby="welcome-basics-title">
        <div class="basic">
          <dt class="basic__label">Pages</dt>
          <dd class="basic__text">Keep each area separate.</dd>
        </div>
        <div class="basic">
          <dt class="basic__label">Towers</dt>
          <dd class="basic__text">Stack related tasks together.</dd>
        </div>
        <div class="basic">
          <dt class="basic__label">Blocks</dt>
          <dd class="basic__text">Finished tasks become colored blocks.</dd>
        </div>
      </dl>

      <div class="actions">
        <button type="button" (click)="startFresh.emit()">Start empty</button>
        <button type="button" class="primary" (click)="loadExample.emit()">Load sample towers</button>
      </div>
    </div>
  `,
  styles: `
    @import '../../../library/main';

    :host { display: block; }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      clip-path: inset(50%);
      white-space: nowrap;
      border: 0;
    }

    .welcome-card {
      @include card();
      width: min(560px, calc(100vw - (2 * var(--large-padding))));
      max-width: 560px;
      max-height: calc(100svh - (2 * var(--medium-padding)));
      overflow-y: auto;
      @media (max-width: $mobile-width) {
        width: min(88vw, calc(100vw - (2 * var(--medium-padding))));
        max-width: 88vw;
        padding: var(--medium-padding);
      }
      box-sizing: border-box;
      padding: var(--large-padding);
      position: relative;
      box-shadow: $shadow;
      text-align: left;
      font-family: $normal-font;
      font-weight: 300;
      font-size: var(--medium-font-size);
      line-height: 1.45;
      @include inner-spacing(var(--medium-padding));

      h2,
      h3,
      p,
      dl,
      dd {
        margin: 0;
      }

      .exit {
        position: absolute;
        top: var(--medium-padding);
        right: var(--medium-padding);
        @include exit();
      }

      h2 {
        font-family: $title-font;
        font-weight: 400;
        font-size: var(--larger-font-size);
        text-align: center;
        padding: 0 36px;
        line-height: 1.25;

        @media (max-width: $mobile-width) {
          padding: 0 28px;
        }
      }

      .lead {
        color: $text-color;
        font-family: inherit;
        font-weight: inherit;
        font-size: inherit;
        line-height: inherit;
        max-width: 46ch;
        margin-inline: auto;
        text-align: center;
      }

      .tower-preview {
        box-sizing: border-box;
        padding: var(--medium-padding) 0;
        border-top: 1px solid rgba($text-color, 0.08);
        border-bottom: 1px solid rgba($text-color, 0.08);

        @media (max-width: $mobile-width) {
          padding-block: var(--small-padding);
        }
      }

      .preview-shell {
        width: min(100%, 370px);
        margin: 0 auto;
      }

      .preview-page-tab {
        width: 96px;
        height: 14px;
        margin: 0 auto var(--small-padding);
        border-radius: var(--border-radius);
        background: rgba($text-color, 0.08);
        box-shadow: $shadow-border;
      }

      .preview-towers {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        align-items: end;
        gap: var(--small-padding);
      }

      .preview-tower {
        display: flex;
        flex-direction: column;
        min-height: 128px;
        padding: 6px;
        box-sizing: border-box;
        border-radius: var(--border-radius);
        background: rgba($text-color, 0.025);
        box-shadow: $shadow-border;
      }

      .preview-task {
        display: block;
        width: 74%;
        height: 5px;
        margin-bottom: 4px;
        border-radius: var(--border-radius);
        background: var(--task-color);
      }

      .preview-task--short {
        width: 48%;
      }

      .preview-stack {
        display: flex;
        flex-flow: row wrap-reverse;
        align-content: flex-start;
        gap: 2px;
        min-height: 86px;
        margin-top: auto;

        span {
          display: block;
          flex: 0 0 calc((100% - 4px) / 3);
          aspect-ratio: 1;
          border-radius: 2px;
          background: var(--block-color);
          box-shadow: $shadow-border;
        }

        span:nth-child(2n) {
          filter: saturate(0.9) brightness(1.06);
        }

        span:nth-child(3n) {
          filter: saturate(1.08) brightness(0.96);
        }
      }

      @media (prefers-reduced-motion: no-preference) {
        @keyframes preview-task-pulse {
          0%, 100% {
            opacity: 0.42;
            transform: scaleX(0.86);
          }
          45%, 70% {
            opacity: 1;
            transform: scaleX(1);
          }
        }

        @keyframes preview-block-fall {
          0% {
            opacity: 0;
            transform: translateY(-220%);
          }
          60%, 100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .preview-task {
          transform-origin: left center;
          animation: preview-task-pulse 2600ms ease-in-out infinite;
        }

        .preview-stack span {
          opacity: 0;
          animation: preview-block-fall 1200ms cubic-bezier(0.5, 0, 1, 0) forwards;
          animation-delay: calc(160ms + var(--fall-index, 0) * 95ms);
        }

        .preview-stack span:nth-child(1) { --fall-index: 0; }
        .preview-stack span:nth-child(2) { --fall-index: 1; }
        .preview-stack span:nth-child(3) { --fall-index: 2; }
        .preview-stack span:nth-child(4) { --fall-index: 3; }
        .preview-stack span:nth-child(5) { --fall-index: 4; }
        .preview-stack span:nth-child(6) { --fall-index: 5; }
        .preview-stack span:nth-child(7) { --fall-index: 6; }
        .preview-stack span:nth-child(8) { --fall-index: 7; }
        .preview-stack span:nth-child(9) { --fall-index: 8; }
      }

      .preview-tower--reading {
        --block-color: hsl(18, 70%, 58%);
        --task-color: hsla(18, 70%, 58%, 0.26);
      }

      .preview-tower--projects {
        --block-color: hsl(209, 65%, 52%);
        --task-color: hsla(209, 65%, 52%, 0.24);
      }

      .preview-tower--exercise {
        --block-color: hsl(130, 45%, 44%);
        --task-color: hsla(130, 45%, 44%, 0.22);
      }

      .basics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: var(--small-padding);

        @media (max-width: $mobile-width) {
          grid-template-columns: 1fr;
        }
      }

      .basic {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }

      .basic__label,
      .basic__text {
        font-family: inherit;
        font-weight: inherit;
        font-size: inherit;
        line-height: inherit;
      }

      .basic__label {
        color: $text-color;
      }

      .basic__text {
        color: rgba($text-color, 0.82);
      }

      .actions {
        display: flex;
        justify-content: space-around;
        align-items: flex-end;
        flex-wrap: wrap;
        gap: var(--large-padding);
        margin-top: var(--large-padding);

        button {
          font-family: inherit;
          font-weight: inherit;
          font-size: inherit;
          margin: 0;
          max-width: 100%;
          line-height: inherit;
          text-align: center;
        }

        button.primary {
          color: $accent-color;
          border-bottom-color: rgba($accent-color, 0.33);
          &:after { background-color: $accent-color; }
        }

        @media (max-width: $mobile-width) {
          gap: var(--small-padding);
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
