import {
  Component,
  ChangeDetectionStrategy,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { Block, HslColor } from '../../models';
import { getColorOfTag } from '../../utils/color';

export function shouldExpandTasks(keepTasksOpen: boolean, manuallyExpanded: boolean): boolean {
  return keepTasksOpen || manuallyExpanded;
}

export function taskListMaxHeight(expanded: boolean): string {
  return expanded ? 'none' : '0px';
}

/**
 * Tasks accordion — shows pending (not-done) blocks inside a tower.
 * Sits ABOVE the falling-blocks area. Clicking the header expands/collapses
 * unless the page setting is keeping tasks open.
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
      (pointerdown)="$event.stopPropagation()"
      (mousedown)="$event.stopPropagation()"
      (touchstart)="$event.stopPropagation()"
    >
      @if (!initiallyOpen()) {
        <button
          type="button"
          class="header"
          (click)="toggleExpanded($event)"
          [attr.aria-expanded]="expanded()"
        >
          <strong>{{ pending().length === 0 ? '' : pending().length }}</strong>
          @if (pending().length === 0) {
            <span aria-hidden="true">&nbsp;</span>
          } @else {
            {{ pending().length === 1 ? 'task' : 'tasks' }}
          }
        </button>
      }
      <div
        #all
        class="all-task"
        [style.max-height]="taskListMaxHeight(expanded())"
      >
        @for (b of pending(); track b.id) {
          <div class="task-container">
            <button
              type="button"
              class="tickbox"
              [style.background-color]="colorOf(b.tag)"
              (pointerup)="$event.stopPropagation()"
              (touchend)="$event.stopPropagation()"
              (click)="$event.stopPropagation(); markDone.emit(b)"
              [attr.aria-label]="'Mark ' + (b.description || b.tag) + ' done'"
            ></button>
            <button
              type="button"
              class="task-description"
              [style.color]="colorOf(b.tag)"
              (click)="$event.stopPropagation(); edit.emit(b)"
            >{{ b.description || b.tag }}</button>
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

        // Height is bounded by the host (lt-tasks) flex column, which clips but
        // does not scroll. As the sole scroller, this card shrinks to that
        // bound (min-height: 0) and scrolls a tall list inside itself — one
        // scrollbar, sitting within the white card.
        flex: 0 1 auto;
        min-height: 0;
        overflow-y: auto;

        .header {
          all: unset;
          @include medium-text();
          display: block;
          width: 100%;
          box-sizing: border-box;
          cursor: pointer;
          text-align: center;

          &::after {
            content: none;
          }
        }

        .all-task {
          @include inner-spacing(var(--small-padding));

          :first-child { margin-top: var(--small-padding); }

          box-sizing: border-box;
          transition: max-height $long-animation-time;

          /*
           * Clip while collapsed only. When open, let the outer .container own
           * scrolling via max-height: 30vh; a nested scroller here pops a
           * scrollbar the instant a tickbox grows on hover.
           */
          overflow: hidden;

          // Sideways breathing room so the clip doesn't shear the tickbox's
          // hover shadow; negative side margins keep rows flush with the header,
          // and the bottom padding clears the last row's shadow.
          margin: 0 calc(var(--small-padding) / -2);
          padding: 0 calc(var(--small-padding) / 2) calc(var(--small-padding) / 2);

          .task-container {
            display: flex;
            align-items: center;
            gap: var(--small-padding);

            @media (max-width: $mobile-width) {
              gap: calc(var(--small-padding) / 2);
            }

            &:hover .task-description {
              @media (min-width: $mobile-width) {
                color: inherit !important;
              }
            }

            // Tickbox: a generously sized colored button that marks the task
            // done without opening the edit carousel. Hover & focus reveal a
            // subtle inner check mark.
            .tickbox {
              all: unset;                       // strip native button styles
              flex: 0 0 24px;
              cursor: pointer;
              position: relative;
              box-sizing: border-box;
              @include square(24px);
              min-width: 24px;
              min-height: 24px;
              @media (max-width: $mobile-width) {
                @include square(24px);
              }
              border-radius: 4px;
              box-shadow: $shadow-border;
              transition: transform $short-animation-time, box-shadow $long-animation-time;

              &::after {
                content: '✓';
                position: absolute;
                inset: 0;
                /*
                 * Neutralise the global animated-underline bar from
                 * forms.scss (button:after { height: 2px; width: 0->100% on
                 * hover; background-color: $text-color }). The all:unset on the
                 * button does NOT reach the pseudo-element, so without these
                 * resets the bar paints a dark stripe across the top AND
                 * squashes this box to 2px — which centres the glyph near the
                 * top instead of the middle.
                 */
                width: 100%;
                height: 100%;
                background: none;
                @include center-child();
                color: $light-color;
                font: bold 18px/1 $normal-font;   // re-assert font (all:unset dropped it to serif)
                opacity: 0;                        // hidden at rest — only revealed on hover/focus/active
                text-shadow: 0 0 1px rgba(0, 0, 0, 0.4);
                // The ✓ glyph sits a touch high in its em-box; nudge to optical centre.
                transform: translateY(1px);
                transition: opacity $short-animation-time, transform $short-animation-time;
              }

              // Reveal on hover only on real hover-capable pointers. On touch,
              // :hover sticks to whatever ends up under the finger after the
              // tapped task is removed — the next task slides up and would show
              // its ✓. Keyboard focus + the genuine press still reveal it.
              &:focus-visible {
                box-shadow: $shadow;
                transform: scale(1.05);
                &::after { opacity: 0.85; }
              }
              @media (hover: hover) and (pointer: fine) {
                &:hover {
                  box-shadow: $shadow;
                  transform: scale(1.05);
                  &::after { opacity: 0.85; }
                }
              }
              &:active {
                transform: scale(0.95);
                &::after { opacity: 1; transform: translateY(1px) scale(1.05); }
              }
            }

            .task-description {
              all: unset;
              @include medium-text();
              white-space: nowrap;
              text-overflow: ellipsis;
              overflow-x: hidden;
              text-align: left;
              flex: 1 1 auto;
              min-width: 0;
              cursor: pointer;

              @media (max-width: $mobile-width) {
                font-size: var(--medium-font-size);
                font-weight: 500;
                filter: saturate(0.85) brightness(0.82);
              }

              position: relative;
              &::after { content: none; }
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

  private readonly manuallyExpanded = signal(false);
  readonly expanded = computed(() =>
    shouldExpandTasks(this.initiallyOpen(), this.manuallyExpanded()),
  );
  readonly taskListMaxHeight = taskListMaxHeight;

  constructor() {
    // When the page setting switches back to collapsed, discard any older manual
    // open state so the setting is reflected immediately.
    effect(() => {
      const keepOpen = this.initiallyOpen();
      if (!keepOpen) untracked(() => this.manuallyExpanded.set(false));
    });
  }

  colorOf(tag: string): string {
    return getColorOfTag(tag, this.baseColor());
  }

  toggleExpanded(event: Event): void {
    event.stopPropagation();
    if (this.initiallyOpen()) return;
    this.manuallyExpanded.update((v) => !v);
  }
}
