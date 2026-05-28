import {
  Component,
  ChangeDetectionStrategy,
  output,
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
    >
      <div class="modal__dialog" #dialog cdkTrapFocus cdkTrapFocusAutoCapture (keydown.escape)="onClose()">
        <ng-content></ng-content>
      </div>
    </section>
  `,
  styles: `
    @import '../../../library/main';

    section.modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10000;
      @include center-child();
      padding: var(--large-padding);
      box-sizing: border-box;
      background: $background-gradient;
      transition: opacity 300ms;
      opacity: 1;

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
  readonly close = output<void>();

  // The active signal starts false; AfterViewInit flips it true on next tick
  // so the 300ms opacity transition fires on entry (0 → 1).
  readonly active = signal(false);

  private readonly dialogRef = viewChild<ElementRef<HTMLElement>>('dialog');
  private previousFocus: HTMLElement | null = null;
  private escListener!: (e: KeyboardEvent) => void;
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
