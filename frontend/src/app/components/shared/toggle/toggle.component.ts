import {
  Component,
  ChangeDetectionStrategy,
  input,
  model,
} from '@angular/core';

@Component({
  selector: 'lt-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toggle">
      <span [class.active]="!checked()" (click)="set(false)">{{ offLabel() }}</span>
      <label>
        <input
          type="checkbox"
          [class.on]="checked()"
          [checked]="checked()"
          (change)="set(!checked())"
        />
      </label>
      <span [class.active]="checked()" (click)="set(true)">{{ onLabel() }}</span>
    </div>
  `,
  styles: `
    @import '../../../../library/main';

    :host {
      $size: 30px;

      @include center-child();
      @include inner-spacing(var(--medium-padding), $horizontal: true);

      .toggle {
        display: contents;
      }

      span {
        @include medium-text();
        // Fixed width (not max-width) so multiple toggles align column-wise
        // — the thumb position is identical across rows regardless of label.
        flex: 0 0 auto;
        width: 4 * $size;
        box-sizing: border-box;
        padding: 0 var(--small-padding);
        line-height: 1.3;
        cursor: pointer;

        &.active { font-weight: bold; }
        &:first-of-type { text-align: right; }
        &:last-of-type  { text-align: left; }
      }

      label {
        display: block;

        input[type='checkbox'] {
          -webkit-appearance: none;
          -moz-appearance: none;
          width: 2 * $size;
          height: $size;
          border-radius: 1000px;
          box-shadow: $shadow-border;
          position: relative;
          cursor: pointer;

          &:after {
            content: '';
            position: absolute;
            display: block;
            left: 0;
            @include square($size);
            border-radius: 1000px;
            background-color: $text-color;
            transition: box-shadow $long-animation-time, left $long-animation-time, transform $long-animation-time;
          }

          &.on:after { left: $size; }
        }

        input[type='checkbox'] {
          @media (min-width: $mobile-width) {
            &:hover:after {
              box-shadow: $shadow;
              transform: translateX(2px);
            }
            &.on:hover:after {
              transform: translateX(-2px);
            }
          }
        }
      }
    }
  `,
})
export class ToggleComponent {
  readonly checked = model<boolean>(false);
  readonly offLabel = input<string>('No');
  readonly onLabel = input<string>('Yes');

  set(value: boolean): void {
    this.checked.set(value);
  }
}
