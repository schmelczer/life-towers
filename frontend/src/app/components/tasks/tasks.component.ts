import { Component, ChangeDetectionStrategy, input, output, signal, effect, untracked } from '@angular/core';
import { Block, HslColor } from '../../models';
import { getColorOfTag } from '../../utils/color';

/**
 * Tasks accordion — shows pending (not-done) blocks inside a tower.
 * Sits ABOVE the falling-blocks area. Clicking the header expands/collapses.
 * Clicking the colored tickbox marks the task done.
 * Clicking the description opens the block-edit modal via the `edit` output.
 */
@Component({
  selector: 'lt-tasks',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="container"
      [class.show-hover]="pending().length > 0"
      (click)="expanded.update(v => !v)"
    >
      <p class="header">
        <strong>{{ pending().length === 0 ? '' : pending().length }}</strong>
        {{ pending().length === 0 ? '​' : pending().length === 1 ? 'task' : 'tasks' }}
      </p>
      <div
        class="all-task"
        #all
        [style.height.px]="expanded() ? all.scrollHeight : 0"
      >
        @for (b of pending(); track b.id) {
          <div class="task-container">
            <button
              type="button"
              class="tickbox"
              [style.background-color]="colorOf(b.tag)"
              (click)="$event.stopPropagation(); markDone.emit(b)"
              [attr.aria-label]="'Mark ' + (b.description || b.tag) + ' done'"
            ></button>
            <p
              [style.color]="colorOf(b.tag)"
              (click)="$event.stopPropagation(); edit.emit(b)"
            >{{ b.description || b.tag }}</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    @import '../../../library/main';

    :host {
      width: 100%;
      box-sizing: border-box;
      position: relative;
      // Within the tower stacking context: high enough to float above the
      // falling-blocks layer. Globally low enough that modals + the carousel
      // (10000+) always cover us.
      z-index: 5;

      .container {
        @include card();

        cursor: pointer;
        transition: box-shadow $long-animation-time;
        &.show-hover:hover {
          box-shadow: $shadow-border;
        }

        padding: calc(var(--small-padding) / 2);
        margin: calc(var(--small-padding) / 2);

        max-height: 30vh;
        overflow-y: auto;

        .header { cursor: pointer; }

        p { font-size: var(--medium-font-size); }

        .all-task {
          @include inner-spacing(var(--small-padding));

          :first-child { margin-top: var(--small-padding); }

          height: 0;
          box-sizing: border-box;
          transition: height $long-animation-time;
          overflow-y: hidden;

          .task-container {
            display: flex;
            align-items: center;
            gap: var(--small-padding);

            &:hover p {
              @media (min-width: $mobile-width) {
                color: inherit !important;
              }
            }

            // Tickbox: a generously sized colored button that marks the task
            // done without opening the edit carousel. Hover & focus reveal a
            // subtle inner check mark.
            .tickbox {
              flex: 0 0 auto;
              all: unset;                       // strip native button styles
              cursor: pointer;
              position: relative;
              box-sizing: border-box;
              @include square(24px);
              @media (max-width: $mobile-width) {
                @include square(20px);
              }
              border-radius: 4px;
              box-shadow: $shadow-border;
              transition: transform $short-animation-time, box-shadow $long-animation-time;

              &::after {
                content: '✓';
                position: absolute;
                inset: 0;
                @include center-child();
                color: $light-color;
                font-size: 18px;
                font-weight: bold;
                line-height: 1;
                opacity: 0.5;
                text-shadow: 0 0 1px rgba(0, 0, 0, 0.4);
                transform: translateY(2px);
                transition: opacity $short-animation-time, transform $short-animation-time;
              }

              &:hover,
              &:focus-visible {
                box-shadow: $shadow;
                transform: scale(1.05);
                &::after { opacity: 0.85; }
              }
              &:active {
                transform: scale(0.95);
                &::after { opacity: 1; transform: translateY(2px) scale(1.05); }
              }
            }

            p {
              white-space: nowrap;
              text-overflow: ellipsis;
              overflow-x: hidden;
              text-align: left;
              flex: 1 1 auto;
              cursor: pointer;

              @media (max-width: $mobile-width) {
                font-size: calc(var(--small-font-size) / 2 + var(--medium-font-size) / 2);
              }

              position: relative;
            }
          }
        }
      }
    }
  `,
})
export class TasksComponent {
  readonly pending = input.required<Block[]>();
  readonly baseColor = input.required<HslColor>();
  /** When true, the accordion starts expanded on first render. */
  readonly initiallyOpen = input<boolean>(false);

  /** Emitted when the colored tickbox is clicked — parent flips is_done to true. */
  readonly markDone = output<Block>();
  /** Emitted when the description is clicked — parent opens the block-edit modal. */
  readonly edit = output<Block>();

  readonly expanded = signal(false);

  constructor() {
    // Re-sync `expanded` whenever the `initiallyOpen` input changes so flipping
    // the "Keep tasks open" page setting expands/collapses the accordion live.
    // User clicks (which mutate `expanded` directly) are respected until the
    // setting changes again.
    effect(() => {
      const open = this.initiallyOpen();
      untracked(() => this.expanded.set(open));
    });
  }

  colorOf(tag: string): string {
    return getColorOfTag(tag, this.baseColor());
  }
}
