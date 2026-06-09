import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  OnInit,
  inject,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Tower, HslColor } from '../../models';
import { ColorPickerComponent } from '../shared/color-picker/color-picker.component';

export interface TowerSettingsResult {
  name: string;
  base_color: HslColor;
}

@Component({
  selector: 'lt-tower-settings',
  standalone: true,
  imports: [ReactiveFormsModule, ColorPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button class="exit" type="button" (click)="close.emit()" aria-label="Close"></button>

    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <input
        id="ts-name"
        name="towerName"
        type="text"
        formControlName="name"
        [placeholder]="tower() ? 'Tower name…' : 'New tower'"
        maxlength="200"
        autocomplete="off"
        class="title-input"
      />

      <div class="picker-row">
        <lt-color-picker [color]="currentColor" (colorChange)="onColorChange($event)" />
      </div>

      @if (tower()) {
        <!-- Editing an existing tower: changes auto-save, so there's no Save
             button — only the destructive action remains explicit. -->
        <button type="button" (click)="delete.emit()">Delete tower</button>
      } @else {
        <button type="submit" [disabled]="form.invalid">Create tower</button>
      }
    </form>
  `,
  styles: `
    @import '../../../library/main';

    :host {
      @include card();
      width: 66vw;
      max-width: 400px;
      box-sizing: border-box;
      padding: var(--large-padding);
      padding-top: calc(var(--large-padding) + var(--medium-padding));
      position: relative;
      box-shadow: $shadow;
      display: block;

      @media (max-width: $mobile-width) {
        width: 88vw;
        max-width: 88vw;
        padding: var(--medium-padding);
        padding-top: calc(var(--large-padding) + 2 * var(--medium-padding));
      }

      .exit {
        position: absolute;
        top: var(--medium-padding);
        right: var(--medium-padding);
        @include exit();
      }

      form {
        @include inner-spacing(var(--large-padding));
      }

      .title-input {
        @include title-text();
        text-align: center;
        width: 100%;
        background: transparent;
        border: 0;
      }

      button {
        display: block;
        // Stay full-width on mobile, but switch to flex so forms.scss's
        // bottom-alignment keeps the underline hugging the label in the 42px
        // tap target (plain block centres the text and strands the underline).
        @media (max-width: $mobile-width) {
          display: flex;
        }
      }
    }
  `,
})
export class TowerSettingsComponent implements OnInit {
  readonly tower = input<Tower | null>(null);
  readonly save = output<TowerSettingsResult>();
  readonly delete = output<void>();
  readonly close = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
  });

  currentColor: HslColor = randomDefaultColor();

  ngOnInit(): void {
    const t = this.tower();
    if (t) {
      this.form.patchValue({ name: t.name });
      this.currentColor = { ...t.base_color };

      // Edit mode: persist name changes as they happen. Wire this up *after*
      // the initial patchValue so seeding the form doesn't fire a save.
      this.form.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.autoSave());
    }
  }

  onColorChange(color: HslColor): void {
    this.currentColor = color;
    // In edit mode the picker is a live control — commit each change.
    if (this.tower()) this.autoSave();
  }

  onSubmit(): void {
    // Only the create flow reaches here via its Submit button; edit mode
    // auto-saves (and Enter on the single field is a harmless redundant save).
    this.tryEmitSave();
  }

  private autoSave(): void {
    this.tryEmitSave();
  }

  private tryEmitSave(): void {
    if (this.form.invalid) return;
    this.emitSave();
  }

  private emitSave(): void {
    this.save.emit({ name: this.form.value.name ?? '', base_color: this.currentColor });
  }
}

function randomDefaultColor(): HslColor {
  // Pick a hue in [0°, 30°] ∪ [200°, 360°] — warm or cool, avoid green.
  const warm = Math.random() < 0.5;
  const hueDeg = warm ? Math.random() * 30 : 200 + Math.random() * 160;
  return { h: hueDeg / 360, s: 0.7, l: 0.55 };
}
