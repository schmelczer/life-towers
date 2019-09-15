import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-toggle',
  templateUrl: './toggle.component.html',
  styleUrls: ['./toggle.component.scss']
})
export class ToggleComponent {
  @Input() beforeText: string;
  @Input() afterText: string;

  @Input() disabled = false;

  @Output() value: EventEmitter<boolean> = new EventEmitter();

  @Input() set default(value: boolean) {
    this._on = value;
  }

  private _on = false;
  set on(value: boolean) {
    this._on = value;
    this.value.emit(value);
  }

  get on(): boolean {
    return this._on;
  }
}
