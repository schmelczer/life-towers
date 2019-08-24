import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-select-add',
  templateUrl: './select-add.component.html',
  styleUrls: ['./select-add.component.scss']
})
export class SelectAddComponent {
  @Input() placeholder = 'Add a new value…';
  @Input() maxItemCount = 7;
  @Input() options: string[];
  @Input() alwaysDropShadow = false;
  @Input() onlyShadowBorder = false;

  @Input() set default(value: string) {
    this.selected = value;
    if (value) {
      this.value.emit(value);
    }
  }

  @Output() value: EventEmitter<string> = new EventEmitter();

  @ViewChild('top') top: ElementRef;
  @ViewChild('bottom') bottom: ElementRef;

  selected: string;
  newOption: string;
  isOpen = false;

  get otherOptions(): string[] {
    return this.options.filter(a => a !== this.selected);
  }

  handleKeys(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.addNewOption();
    }
  }

  get backgroundHeight(): string {
    if (this.isOpen && this.top && this.bottom) {
      const topHeight = this.top.nativeElement.clientHeight;
      const bottomHeight = this.bottom.nativeElement.clientHeight;
      return `${topHeight + bottomHeight}px`;
    }
    return `100%`;
  }

  addNewOption() {
    if (this.newOption) {
      this.select(this.newOption);
      this.newOption = '';
    }
  }

  select(option: string) {
    this.selected = option;
    this.value.emit(this.selected);
    this.toggle();
  }

  toggle() {
    this.isOpen = !this.isOpen;
  }
}
