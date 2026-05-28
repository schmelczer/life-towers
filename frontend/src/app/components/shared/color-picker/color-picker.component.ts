import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { HslColor } from '../../../models';
import { toCss } from '../../../utils/color';

// 12 hand-picked hues. Rationale:
//  – Warm cluster (0–45°): coral/red, orange-red, orange, amber — vivid warm tones
//  – Skipped 60–180° (yellows + greens) — most read as muddy next to the rose UI accent
//  – Cool cluster (195–260°): sky-cyan, azure, blue, indigo — clean, distinct from rose
//  – Purple-rose cluster (280–355°): violet, magenta, rose-pink, near-red — complements the accent
const PRESETS: number[] = [0, 15, 30, 45, 195, 215, 235, 255, 280, 310, 335, 355];

const FIXED_S = 0.7;
const FIXED_L = 0.55;

@Component({
  selector: 'lt-color-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="picker">
      <div class="swatches" role="group" aria-label="Preset colors">
        @for (h of presetHues; track h) {
          <button
            type="button"
            class="swatch"
            [class.active]="isActiveHue(h)"
            [style.background-color]="hueToCss(h)"
            [attr.aria-label]="'Pick hue ' + h + ' degrees'"
            [attr.aria-pressed]="isActiveHue(h)"
            (click)="pickHue(h)"
          ></button>
        }
      </div>

      <div class="hue-slider">
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          [value]="hueDeg()"
          (input)="onSlider($any($event.target).value)"
          [style.--thumb-color]="toCss(color())"
          aria-label="Hue"
        />
      </div>

      <div class="preview" [style.background-color]="toCss(color())" aria-hidden="true"></div>
    </div>
  `,
  styles: `
    @import '../../../../library/main';

    :host {
      display: block;
      padding: var(--medium-padding);
      @include card();
      box-shadow: $shadow-border;
    }

    .picker {
      display: flex;
      flex-direction: column;
      gap: var(--medium-padding);
      width: 100%;
    }

    .swatches {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 6px;

      .swatch {
        all: unset;
        cursor: pointer;
        aspect-ratio: 1;
        border-radius: 4px;
        box-shadow: $shadow-border;
        transition: transform $short-animation-time, box-shadow $long-animation-time;

        &:hover,
        &:focus-visible {
          box-shadow: $shadow;
          transform: scale(1.1);
        }

        &.active {
          box-shadow: $shadow;
          transform: scale(1.15);
          outline: 2px solid $light-color;
          outline-offset: 1px;
        }
      }
    }

    .hue-slider {
      input[type='range'] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 12px;
        border-radius: 1000px;
        background: linear-gradient(
          to right,
          hsl(0, 70%, 55%),
          hsl(60, 70%, 55%),
          hsl(120, 70%, 55%),
          hsl(180, 70%, 55%),
          hsl(240, 70%, 55%),
          hsl(300, 70%, 55%),
          hsl(360, 70%, 55%)
        );
        outline: none;
        cursor: pointer;

        &::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 24px;
          width: 24px;
          border-radius: 1000px;
          background-color: var(--thumb-color, #{$light-color});
          box-shadow: 0 0 0 2px #{$light-color}, #{$shadow};
          cursor: grab;

          &:active {
            cursor: grabbing;
          }
        }

        &::-moz-range-thumb {
          height: 24px;
          width: 24px;
          border-radius: 1000px;
          background-color: var(--thumb-color, white);
          border: 2px solid white;
          box-shadow: $shadow;
          cursor: grab;

          &:active {
            cursor: grabbing;
          }
        }
      }
    }

    .preview {
      height: 40px;
      border-radius: var(--border-radius);
      box-shadow: $shadow-border;
    }
  `,
})
export class ColorPickerComponent {
  readonly color = input.required<HslColor>();
  readonly colorChange = output<HslColor>();

  readonly presetHues = PRESETS;

  readonly hueDeg = computed(() => Math.round(this.color().h * 360));

  isActiveHue(h: number): boolean {
    return Math.abs(this.hueDeg() - h) < 8;
  }

  hueToCss(h: number): string {
    return `hsl(${h}, 70%, 55%)`;
  }

  toCss(c: HslColor): string {
    return toCss(c);
  }

  pickHue(h: number): void {
    this.colorChange.emit({ h: h / 360, s: FIXED_S, l: FIXED_L });
  }

  onSlider(value: string): void {
    this.colorChange.emit({ h: Number(value) / 360, s: FIXED_S, l: FIXED_L });
  }
}
