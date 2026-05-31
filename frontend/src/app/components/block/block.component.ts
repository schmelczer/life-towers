import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { Block, HslColor } from '../../models';
import { getColorOfTag } from '../../utils/color';

/**
 * A block rendered as a small COLORED SQUARE (1/6 of tower width).
 * Only DONE blocks appear here; pending blocks appear in the tasks accordion.
 * Clicking opens the block-edit modal in the parent tower component.
 */
@Component({
  selector: 'lt-block',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      role="button"
      tabindex="0"
      aria-label="Edit completed task"
      [class.hovered]="hovered()"
      [style.background-color]="color()"
      (click)="clicked.emit()"
      (keydown.enter)="clicked.emit()"
      (keydown.space)="$event.preventDefault(); clicked.emit()"
    ></div>
  `,
  styles: `
    @import '../../../library/main';

    :host {
      position: relative;
      width: calc(100% / 6);
      padding-bottom: calc(100% / 6);

      div {
        position: absolute;
        width: 100%;
        height: 100%;
        cursor: pointer;

        @media (hover: hover) and (pointer: fine) {
          transition: transform $long-animation-time;

          &:hover,
          &.hovered {
            transform: translateY(4px);
          }
        }
      }
    }
  `,
})
export class BlockComponent {
  readonly block = input.required<Block>();
  readonly baseColor = input.required<HslColor>();
  readonly hovered = input(false);

  /** Emits when the square is clicked — parent opens the block-edit modal. */
  readonly clicked = output<void>();

  readonly color = computed(() => getColorOfTag(this.block().tag, this.baseColor()));
}
