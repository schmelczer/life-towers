import {
  Component,
  ChangeDetectionStrategy,
  output,
  input,
  signal,
  AfterViewInit,
  OnDestroy,
  viewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { ModalStateService } from '../../services/modal-state.service';

@Component({
  selector: 'lt-modal',
  standalone: true,
  imports: [A11yModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="modal"
      [class.active]="active()"
      (click)="onBackdropClick($event)"
      (keydown.enter)="onBackdropClick($any($event))"
      tabindex="-1"
    >
      <div
        class="modal__dialog"
        #dialog
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="labelledBy()"
        [attr.aria-describedby]="describedBy()"
        cdkTrapFocus
        cdkTrapFocusAutoCapture
        (keydown.escape)="onClose()"
      >
        <ng-content></ng-content>
      </div>
    </section>
  `,
  styles: `
    @import '../../../library/main';

    /* Keep the component host out of parent flex/grid flow. Parent containers
       apply spacing to direct children, so relying on the fixed child alone can
       still let <lt-modal> become a layout item when it mounts. */
    :host {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: block;
      margin: 0 !important;
    }

    section.modal {
      position: absolute;
      inset: 0;
      @include center-child();
      padding: var(--large-padding);
      box-sizing: border-box;
      background: rgba(255, 248, 248, 0.94);
      transition: opacity 300ms;
      opacity: 1;
      overflow-y: auto;

      @media (max-width: $mobile-width) {
        padding: var(--medium-padding);
      }

      @media (max-height: $min-height) {
        align-items: flex-start;
      }

      &:not(.active) {
        opacity: 0;
        pointer-events: none;
      }

      button {
        margin-top: var(--medium-padding);
      }
    }
  `,
})
export class ModalComponent implements AfterViewInit, OnDestroy {
  readonly labelledBy = input<string | null>(null);
  readonly describedBy = input<string | null>(null);
  readonly close = output<void>();

  // The active signal starts false; AfterViewInit flips it true on next tick
  // so the 300ms opacity transition fires on entry (0 → 1).
  readonly active = signal(false);

  private readonly dialogRef = viewChild<ElementRef<HTMLElement>>('dialog');
  private previousFocus: HTMLElement | null = null;
  private readonly modalState = inject(ModalStateService);

  ngAfterViewInit(): void {
    this.previousFocus = document.activeElement as HTMLElement;
    // Track open state so towers can be locked while any modal is mounted.
    this.modalState.open();
    // Defer one tick so the opacity transition runs (0 → 1).
    setTimeout(() => this.active.set(true), 0);
  }

  ngOnDestroy(): void {
    this.modalState.close();
    this.previousFocus?.focus();
  }

  onBackdropClick(event: MouseEvent): void {
    const dialog = this.dialogRef()?.nativeElement;
    if (dialog && !dialog.contains(event.target as Node)) {
      this.onClose();
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
