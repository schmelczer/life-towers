import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  effect,
  untracked,
} from '@angular/core';

export interface DoubleSliderRange<T> {
  from: T;
  to: T;
}

/**
 * Two-thumb range slider — legacy "double-slider".
 * Hands an indexed range over an arbitrary values array; emits the
 * underlying values on each change. Labels magnetically lift as a thumb
 * approaches them (rotated -45°), per the legacy.
 */
@Component({
  selector: 'lt-double-slider',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container">
      <label for="ds-1">From</label>
      <label for="ds-2">To</label>
      <input
        id="ds-1"
        type="range"
        min="0"
        [max]="MAX - 1"
        [value]="oneValue()"
        (input)="oneValue.set(+$any($event.target).value)"
      />
      <input
        id="ds-2"
        type="range"
        min="0"
        [max]="MAX - 1"
        [value]="otherValue()"
        (input)="otherValue.set(+$any($event.target).value)"
      />
      <div class="value-container">
        @for (i of drawnIndices(); track i) {
          <span [style.transform]="getOffset(i)">{{ drawnLabels()[i] }}</span>
        }
      </div>
    </div>
  `,
  styles: `
    @import '../../../../library/main';

    $line-height: 2px;
    $height: 90px;
    $slider-size: 40px;

    .container {
      width: 100%;
      max-width: 800px;
      height: $height;
      position: relative;
      margin: calc(#{$slider-size} / 2) auto 0 auto;

      label { display: none; }

      input[type='range'] {
        width: 100%;
        position: absolute;
        left: 0;
        -webkit-appearance: none;
        appearance: none;
        outline: none;
        background: transparent;

        &::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: $slider-size;
          width: $slider-size;
          border-radius: 1000px;
          background-color: $light-color;
          box-shadow: $shadow-border;
          transform-origin: center center;
          transform: translateY(calc(-1 * #{$slider-size} / 2 + #{$line-height} / 2));
          transition: box-shadow $long-animation-time, transform $long-animation-time;
          @media (min-width: $mobile-width) {
            &:hover {
              box-shadow: $shadow;
              transform: translateY(calc(-1 * #{$slider-size} / 2 + #{$line-height} / 2))
                scale(1.1);
            }
          }
          cursor: pointer;
          position: relative;
          z-index: 2;
        }

        &::-moz-range-thumb {
          -moz-appearance: none;
          appearance: none;
          height: $slider-size;
          width: $slider-size;
          border-radius: 1000px;
          background-color: $light-color;
          border: none;
          box-shadow: $shadow-border;
          cursor: pointer;
        }

        &::-webkit-slider-runnable-track {
          -webkit-appearance: none;
          width: 100%;
          height: $line-height;
          background-color: $text-color;
          border-radius: 1000px;
        }

        &::-moz-range-track {
          -moz-appearance: none;
          width: 100%;
          height: $line-height;
          background-color: $text-color;
          border-radius: 1000px;
        }

        &::-moz-focus-outer { border: 0; }
      }

      .value-container {
        font-family: $normal-font;
        color: $text-color;
        font-size: var(--medium-font-size);
        display: flex;
        justify-content: space-evenly;
        margin-top: calc(#{$slider-size} + 8px);

        span {
          display: block;
          margin-top: 14px;
          transform-origin: center bottom;
          transition: transform $long-animation-time;
          white-space: nowrap;
        }
      }
    }
  `,
})
export class DoubleSliderComponent {
  /** Ordered list of underlying values (e.g. dates). */
  readonly values = input.required<unknown[]>();
  /** Display labels for evenly-spaced ticks (≤ values.length). */
  readonly labels = input.required<string[]>();

  readonly rangeChange = output<DoubleSliderRange<unknown>>();

  readonly MAX = 100;

  readonly oneValue = signal(0);
  readonly otherValue = signal(this.MAX - 1);

  private prevValuesLength = 0;

  readonly drawnLabels = computed(() => {
    const labels = this.labels();
    const count = Math.min(labels.length, 6);
    if (count === 0) return [] as string[];
    const jump = Math.max(1, Math.round(labels.length / count));
    return labels.filter((_, i) => i % jump === 0);
  });

  readonly drawnIndices = computed(() =>
    Array.from({ length: this.drawnLabels().length }, (_, i) => i),
  );

  constructor() {
    // Re-emit the value range whenever the slider thumbs or values change.
    effect(() => {
      const a = this.oneValue();
      const b = this.otherValue();
      const vs = this.values();
      if (vs.length === 0) return;
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      untracked(() => {
        this.rangeChange.emit({
          from: vs[this.indexFromValue(lo)],
          to: vs[this.indexFromValue(hi)],
        });
      });
    });

    // Snap the higher thumb to MAX - 1 when a new entry is appended.
    effect(() => {
      const len = this.values().length;
      untracked(() => {
        if (len > this.prevValuesLength) {
          const a = this.oneValue();
          const b = this.otherValue();
          if (a > b) this.oneValue.set(this.MAX - 1);
          else this.otherValue.set(this.MAX - 1);
        }
        this.prevValuesLength = len;
      });
    });
  }

  private indexFromValue(value: number): number {
    return Math.min(
      this.values().length - 1,
      Math.floor((value / this.MAX) * this.values().length),
    );
  }

  /**
   * Magnetic label position: returns a CSS `transform` that lifts the label
   * upward and rotates -45° as a thumb approaches.
   */
  getOffset(index: number): string {
    const labelIndex = index / Math.max(1, this.drawnLabels().length);
    const a = this.oneValue() / this.MAX - 0.1;
    const b = this.otherValue() / this.MAX - 0.1;
    const dist = Math.min(Math.abs(labelIndex - a), Math.abs(labelIndex - b));
    const ACTIVE_ZONE = 0.2;
    const base = 'translateX(-50%) rotate(-30deg) translateY(100%)';
    if (dist > ACTIVE_ZONE) return base;
    const lift = ((ACTIVE_ZONE - dist) / ACTIVE_ZONE) * 36;
    return `translateY(${lift}px) ${base}`;
  }
}
