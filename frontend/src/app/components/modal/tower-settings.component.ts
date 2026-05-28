import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  OnInit,
  inject,
} from '@angular/core';
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
    <div class="header">
      <div class="exit" (click)="close.emit()" role="button" aria-label="Close"></div>
      <h2>{{ tower() ? 'Tower settings' : 'New tower' }}</h2>
    </div>

    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <input
        id="ts-name"
        name="towerName"
        type="text"
        formControlName="name"
        placeholder="Tower name…"
        maxlength="200"
        autocomplete="off"
      />

      <lt-color-picker [color]="currentColor" (colorChange)="onColorChange($event)" />

      <button type="submit" [disabled]="form.invalid">
        {{ tower() ? 'Save' : 'Create tower' }}
      </button>

      @if (tower()) {
        <button type="button" (click)="delete.emit()">Delete tower</button>
      }
    </form>
  `,
  styles: `
    @import '../../../library/main';

    :host {
      @include card();
      width: 66vw;
      max-width: 400px;
      @media (max-width: $mobile-width) { width: 300px; }
      box-sizing: border-box;
      padding: var(--large-padding);
      position: relative;
      box-shadow: $shadow;
      @include inner-spacing(var(--large-padding));
      display: block;

      .header {
        @include center-child();

        .exit {
          position: absolute;
          left: var(--large-padding);
          @include exit();
        }
      }

      input[type='text'] {
        text-align: center;
      }

      button {
        display: block;
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

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
  });

  currentColor: HslColor = randomDefaultColor();

  ngOnInit(): void {
    const t = this.tower();
    if (t) {
      this.form.patchValue({ name: t.name });
      this.currentColor = { ...t.base_color };
    }
  }

  onColorChange(color: HslColor): void {
    this.currentColor = color;
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    this.save.emit({ name: v.name ?? '', base_color: this.currentColor });
  }
}

function randomDefaultColor(): HslColor {
  // Pick a hue in [0°, 30°] ∪ [200°, 360°] — warm or cool, avoid green.
  const warm = Math.random() < 0.5;
  const hueDeg = warm ? Math.random() * 30 : 200 + Math.random() * 160;
  return { h: hueDeg / 360, s: 0.7, l: 0.55 };
}
