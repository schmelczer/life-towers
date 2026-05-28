import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Page } from '../../models';
import { ToggleComponent } from '../shared/toggle/toggle.component';

export interface PageSettingsResult {
  name: string;
  hide_create_tower_button: boolean;
  keep_tasks_open: boolean;
}

@Component({
  selector: 'lt-page-settings',
  standalone: true,
  imports: [ReactiveFormsModule, ToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="header">
      <div class="exit" (click)="close.emit()" role="button" aria-label="Close"></div>
      <h2>{{ page() ? 'Page settings' : 'New page' }}</h2>
    </div>

    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <input
        id="ps-name"
        type="text"
        formControlName="name"
        maxlength="200"
        autocomplete="off"
        placeholder="Page name…"
      />

      <div class="toggle-row">
        <lt-toggle
          [checked]="hideCreateTowerButton()"
          (checkedChange)="hideCreateTowerButton.set($event)"
          offLabel="Show add-tower button"
          onLabel="Hide add-tower button"
        />
      </div>

      <div class="toggle-row">
        <lt-toggle
          [checked]="keepTasksOpen()"
          (checkedChange)="keepTasksOpen.set($event)"
          offLabel="Show tasks collapsed"
          onLabel="Keep tasks open"
        />
      </div>

      <button type="submit" [disabled]="form.invalid">
        {{ page() ? 'Save' : 'Create page' }}
      </button>

      @if (page()) {
        <button type="button" (click)="delete.emit()">Delete page</button>
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

      .toggle-row {
        display: flex;
        justify-content: center;
      }

      button {
        display: block;
      }
    }
  `,
})
export class PageSettingsComponent implements OnInit {
  readonly page = input<Page | null>(null);
  readonly save = output<PageSettingsResult>();
  readonly delete = output<void>();
  readonly close = output<void>();

  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
  });

  hideCreateTowerButton = signal(false);
  readonly keepTasksOpen = signal(false);

  ngOnInit(): void {
    const p = this.page();
    if (p) {
      this.form.patchValue({ name: p.name });
      this.hideCreateTowerButton.set(p.hide_create_tower_button);
      this.keepTasksOpen.set(p.keep_tasks_open);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    this.save.emit({
      name: v.name ?? '',
      hide_create_tower_button: this.hideCreateTowerButton(),
      keep_tasks_open: this.keepTasksOpen(),
    });
  }
}
