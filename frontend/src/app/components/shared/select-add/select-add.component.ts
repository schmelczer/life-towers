import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  ElementRef,
  HostListener,
  inject,
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
      <div
        class="top"
        role="button"
        tabindex="0"
        [attr.aria-expanded]="open()"
        (click)="toggleOpen($event)"
        (keydown.enter)="toggleOpen($event)"
        (keydown.space)="$event.preventDefault(); toggleOpen($event)"
      >
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
                maxlength="200"
                (blur)="onRename(item, $any($event.target).value)"
              />
            } @else {
              <button class="option" type="button" (click)="onSelectItem(item)">
                {{ item }}
              </button>
            }
          }
          <div class="add-row">
            <input
              type="text"
              #addInput
              placeholder="Add a value…"
              maxlength="200"
              (keydown.enter)="onAdd(addInput.value); addInput.value = ''"
            />
            <button
              class="add-button"
              type="button"
              (click)="onAdd(addInput.value); addInput.value = ''"
            >
              Add
            </button>
            @if (editable()) {
              <button
                class="pen"
                type="button"
                [class.active]="editing()"
                (click)="editing.update(v => !v)"
              >
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
    $dropdown-shadow: 0 4px 14px rgba($text-color, 0.16), $shadow-border;

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
        min-height: 46px;
        box-sizing: border-box;
        gap: var(--small-padding);

        p {
          display: block;
          @include sub-title-text();
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: left;
        }

        img.arrow {
          flex: 0 0 auto;
          @include square(16px);
          transition: transform $long-animation-time;

          &.upside-down {
            transform: rotate(-180deg);
          }
        }
      }

      .bottom-container {
        width: 100%;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        overflow: visible;
        pointer-events: none;
        z-index: 5;

        .bottom {
          position: relative;
          width: 100%;
          pointer-events: none;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          border-radius: 0 0 var(--border-radius) var(--border-radius);
          padding: $inner-padding;
          padding-top: var(--small-padding);
          gap: var(--small-padding);
          // Default (closed) state — also the target of the close transition.
          background-color: transparent;
          box-shadow: none;
          transform: translateY(-8px);
          opacity: 0;
          visibility: hidden;
          // Clip the top edge so the panel's shadow can't bleed back up into
          // the chip area; sides + bottom get a 10px slack for the shadow.
          clip-path: inset(0 -10px -10px -10px);
          // Delay the visibility change until after the slide animation finishes
          // so the panel stays visible while it animates closed.
          transition:
            transform $long-animation-time,
            opacity $long-animation-time,
            background-color $long-animation-time,
            box-shadow $long-animation-time,
            visibility 0s $long-animation-time;

          &.open {
            visibility: visible;
            pointer-events: all;
            transform: none;
            opacity: 1;
            background-color: $light-color;
            box-shadow: $dropdown-shadow;
            // On open, visibility flips immediately (no delay); transform +
            // colors + shadow animate over $long-animation-time.
            transition:
              transform $long-animation-time,
              opacity $long-animation-time,
              background-color $long-animation-time,
              box-shadow $long-animation-time,
              visibility 0s 0s;
          }

          .option {
            @include sub-title-text();
            display: flex;
            align-items: center;
            width: 100%;
            min-height: 36px;
            margin: 0;
            padding: 0;
            border: 0;
            background: transparent;
            text-align: left;
            cursor: pointer;

            &:after {
              display: none;
            }

            @media (max-width: $mobile-width) {
              min-height: 42px;
            }
          }

          input[type='text'] {
            @include sub-title-text();
            width: 100%;
            min-height: 36px;
            box-sizing: border-box;
            text-align: left;

            &::placeholder {
              color: rgba($text-color, 0.72);
              opacity: 1;
            }

            @media (max-width: $mobile-width) {
              min-height: 42px;
            }
          }

          .add-row {
            min-height: 40px;
            position: relative;
            width: 100%;
            display: flex;
            align-items: flex-end;
            gap: var(--small-padding);

            input[type='text'] {
              flex: 1;
              min-height: 0;
              padding: 0;
              border-bottom: solid 2px transparent;

              &:focus,
              &:focus-visible {
                box-shadow: none;
                border-bottom-color: $text-color;
              }
            }

            button {
              margin: 0;
              position: relative;
              flex: 0 0 auto;

              &.add-button {
                align-self: flex-end;
              }

              &.pen {
                opacity: 0.25;
                cursor: pointer;
                display: flex;
                align-items: center;
                padding: 0;
                border: none;
                background: transparent;
                position: relative;

                // Kill the global button's hover-grow underline pseudo-element
                // for the icon-only edit control.
                &:after { content: none; display: none; }

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
        box-sizing: border-box;
        transition:
          box-shadow $long-animation-time,
          height $long-animation-time,
          border-radius $long-animation-time;

        &.active {
          // Same shadow recipe as the panel below so the two halves read as
          // one continuous card. Clip the bottom edge so this shadow doesn't
          // bleed across the seam where .top meets .bottom.
          box-shadow: $dropdown-shadow;
          clip-path: inset(-10px -10px 0 -10px);
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

      // Hover lifts the chip — but only when the dropdown is closed. When
      // it's open the chip is already showing $dropdown-shadow and a hover
      // override would make the top heavier than the panel below.
      &:hover {
        @media (min-width: $mobile-width) {
          .background:not(.active) { box-shadow: $shadow; }
        }
      }

      &.shadow-border {
        .background.active {
          box-shadow: $shadow-border;
          clip-path: inset(-10px -10px 0 -10px);
        }
        .bottom.open {
          box-shadow: $shadow-border;
        }
      }

      &.shadow-border:hover {
        .background:not(.active) { box-shadow: $shadow-border; }
      }

      &.always-shadow {
        .background:not(.active) { box-shadow: $shadow; }
        // When open, clip the bottom so the always-on shadow doesn't bleed
        // over the seam; restore full shadow when closed.
        &:has(.bottom.open) .background {
          clip-path: inset(-6px -6px 0 -6px);
        }
      }
    }
  `,
})
export class SelectAddComponent {
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
  private readonly host = inject(ElementRef<HTMLElement>);

  // Resolved values that merge old + new API
  protected resolvedItems(): string[] {
    const newItems = this.items();
    const oldOptions = this.options();
    return newItems.length ? newItems : oldOptions;
  }

  protected resolvedSelected(): string | null {
    // New API: string
    const s = this.selected();
    if (s != null && s.trim()) return s;
    // Legacy API: index into options
    const idx = this.selectedIndex();
    const opts = this.resolvedItems();
    if (idx >= 0 && idx < opts.length) return opts[idx];
    return null;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
      this.editing.set(false);
    }
  }

  toggleOpen(event: Event): void {
    event.stopPropagation();
    this.open.update((v) => !v);
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
