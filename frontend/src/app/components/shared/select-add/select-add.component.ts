import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

@Component({
  selector: 'lt-select-add',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="container"
      [class.shadow-border]="onlyShadowBorder()"
      [class.always-shadow]="alwaysDropShadow()"
    >
      <div class="background" [class.active]="open()"></div>
      <div class="top" (click)="open.update(v => !v)">
        <p>{{ resolvedSelected() ?? placeholder() }}</p>
        <img class="arrow" [class.upside-down]="open()" src="assets/arrow.svg" alt="" />
      </div>
      <div class="bottom-container">
        <div class="bottom" [class.open]="open()">
          @for (item of resolvedItems(); track item) {
            @if (editing()) {
              <input
                type="text"
                [value]="item"
                (blur)="onRename(item, $any($event.target).value)"
              />
            } @else {
              <p (click)="onSelectItem(item)">{{ item }}</p>
            }
          }
          <div class="add-row">
            <input
              type="text"
              #addInput
              placeholder="Add a value…"
              (keydown.enter)="onAdd(addInput.value); addInput.value = ''"
            />
            <button (click)="onAdd(addInput.value); addInput.value = ''">Add</button>
            @if (editable()) {
              <button class="pen" [class.active]="editing()" (click)="editing.update(v => !v)">
                <img src="assets/pen.svg" alt="Edit" />
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    @import '../../../../library/main';

    $inner-padding: var(--medium-padding);

    :host {
      display: block;
      width: 100%;
    }

    .container {
      width: 100%;
      position: relative;

      .top,
      .bottom {
        padding: $inner-padding;
        z-index: 4;
      }

      .top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: relative;
        cursor: pointer;

        p {
          display: inline-block;
          @include sub-title-text();
        }

        img.arrow {
          @include square(16px);
          transition: transform $long-animation-time;

          &.upside-down {
            transform: rotate(-180deg);
          }
        }
      }

      .bottom-container {
        width: 100%;
        height: 300px;
        position: absolute;
        overflow-y: hidden;
        pointer-events: none;

        .bottom {
          position: absolute;
          width: 100%;
          pointer-events: all;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          border-radius: 0 0 var(--border-radius) var(--border-radius);
          padding: $inner-padding;
          padding-top: 0;
          @include inner-spacing($inner-padding);
          // Default (closed) state — also the target of the close transition.
          background-color: transparent;
          box-shadow: none;
          transform: translateY(-100%);
          visibility: hidden;
          // Delay the visibility change until after the slide animation finishes
          // so the panel stays visible while it animates closed.
          transition:
            transform $long-animation-time,
            background-color $long-animation-time,
            box-shadow $long-animation-time,
            visibility 0s $long-animation-time;

          &.open {
            visibility: visible;
            transform: none;
            background-color: $light-color;
            box-shadow: $shadow;
            // Show shadow on left/right/bottom only; clip the top edge so the
            // shadow doesn't bleed over the seam where .bottom meets .top.
            clip-path: inset(0 -6px -6px -6px);
            // On open, visibility flips immediately (no delay); transform +
            // colors + shadow animate over $long-animation-time.
            transition:
              transform $long-animation-time,
              background-color $long-animation-time,
              box-shadow $long-animation-time,
              visibility 0s 0s;
          }

          p {
            @include sub-title-text();
            display: inline-block;
            text-align: left;
            cursor: pointer;
          }

          input[type='text'] {
            @include sub-title-text();
            width: 100%;
          }

          .add-row {
            height: 32px;
            @media (max-width: $mobile-width) { height: 24px; }
            position: relative;
            width: 100%;
            display: flex;
            align-items: center;
            gap: var(--small-padding);

            input[type='text'] {
              flex: 1;
            }

            button {
              margin: 0;
              position: static;

              &.pen {
                opacity: 0.25;
                cursor: pointer;
                display: flex;
                align-items: center;
                padding: 0;
                border: none;
                background: transparent;
                position: relative;

                img {
                  @include square(16px);
                }

                &:before {
                  content: '';
                  display: block;
                  position: absolute;
                  bottom: -2px;
                  left: 0;
                  height: 2px;
                  background-color: $text-color;
                  width: 0;
                  transition: width $long-animation-time;
                }

                @media (min-width: $mobile-width) {
                  &:hover { opacity: 0.5; }
                  &:hover:before { width: 100% !important; }
                }

                &.active {
                  opacity: 1;
                  &:before { width: 100% !important; }
                }

                transition: opacity $short-animation-time;
              }
            }
          }
        }
      }

      .background {
        position: absolute;
        top: 0;
        height: 100%;
        width: 100%;
        @include card();
        z-index: 3;
        transition:
          box-shadow $long-animation-time,
          height $long-animation-time,
          border-radius $long-animation-time;

        &.active {
          box-shadow: $shadow;
          // Show shadow on top/left/right only; clip the bottom edge so the
          // shadow doesn't bleed over the seam where .top meets .bottom.
          clip-path: inset(-6px -6px 0 -6px);
        }
      }

      .top {
        transition: border-radius $long-animation-time;
      }

      // When the drawer is open, square the BOTTOM corners on both the
      // background card and the top chip so they merge into one continuous
      // surface. (Animated via the border-radius transitions above.)
      &:has(.bottom.open) {
        .top,
        .background {
          border-radius: var(--border-radius) var(--border-radius) 0 0;
        }
      }

      &:hover {
        @media (min-width: $mobile-width) {
          .background { box-shadow: $shadow; }
        }
      }

      &.shadow-border {
        .background.active {
          box-shadow: $shadow-border;
          clip-path: inset(-6px -6px 0 -6px);
        }
      }

      &.shadow-border:hover {
        .background { box-shadow: $shadow-border; }
      }

      &.always-shadow {
        .background { box-shadow: $shadow; }
        // When open, clip the bottom so the always-on shadow doesn't bleed
        // over the seam; restore full shadow when closed.
        &:has(.bottom.open) .background {
          clip-path: inset(-6px -6px 0 -6px);
        }
      }
    }
  `,
})
export class SelectAddComponent implements OnChanges {
  // ── New API (spec) ─────────────────────────────────────────────────────────
  /** List of string options */
  readonly items = input<string[]>([]);
  /** Currently selected string value */
  readonly selected = input<string | null>(null);
  readonly editable = input<boolean>(false);
  readonly placeholder = input<string>('Select…');
  readonly alwaysDropShadow = input<boolean>(false);
  readonly onlyShadowBorder = input<boolean>(false);

  // ── Legacy compat API (used by pages.component.html until Agent B updates) ─
  /** @deprecated Use items instead */
  readonly options = input<string[]>([]);
  /** @deprecated Use selected (string) instead */
  readonly selectedIndex = input<number>(-1);

  // ── Outputs — new API ──────────────────────────────────────────────────────
  readonly select = output<string>();
  readonly add = output<string>();
  readonly rename = output<{ old: string; new: string }>();
  readonly remove = output<string>();

  // ── Legacy compat outputs ──────────────────────────────────────────────────
  /** @deprecated Use select instead */
  readonly selectionChange = output<number>();

  // ── Internal state ─────────────────────────────────────────────────────────
  readonly open = signal(false);
  readonly editing = signal(false);

  // Resolved values that merge old + new API
  protected resolvedItems(): string[] {
    const newItems = this.items();
    const oldOptions = this.options();
    return newItems.length ? newItems : oldOptions;
  }

  protected resolvedSelected(): string | null {
    // New API: string
    const s = this.selected();
    if (s != null) return s;
    // Legacy API: index into options
    const idx = this.selectedIndex();
    const opts = this.resolvedItems();
    if (idx >= 0 && idx < opts.length) return opts[idx];
    return null;
  }

  ngOnChanges(_changes: SimpleChanges): void {
    // Nothing to do — signals handle reactivity
  }

  onSelectItem(item: string): void {
    this.select.emit(item);
    // Legacy compat: also emit the index
    const idx = this.resolvedItems().indexOf(item);
    if (idx >= 0) this.selectionChange.emit(idx);
    this.open.set(false);
    this.editing.set(false);
  }

  onAdd(value: string): void {
    const v = value.trim();
    if (!v) return;
    this.add.emit(v);
    this.open.set(false);
  }

  onRename(oldValue: string, newValue: string): void {
    const n = newValue.trim();
    if (n && n !== oldValue) {
      this.rename.emit({ old: oldValue, new: n });
    }
  }
}
