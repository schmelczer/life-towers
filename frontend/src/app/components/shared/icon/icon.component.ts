import { Component, ChangeDetectionStrategy, input } from '@angular/core';

export type IconName = 'arrow' | 'pen' | 'plus-sign' | 'trash' | 'x-sign';

@Component({
  selector: 'lt-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img
      [src]="'assets/' + name() + '.svg'"
      [alt]="name()"
      [style.width]="size()"
      [style.height]="size()"
      aria-hidden="true"
    />
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input<string>('1.25rem');
}
