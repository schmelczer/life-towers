import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CancelService } from '../../../services/cancel.service';

@Component({
  selector: 'app-select-add',
  templateUrl: './select-add.component.html',
  styleUrls: ['./select-add.component.scss']
})
export class SelectAddComponent {
  @Input() placeholder = 'Add a new value…';
  @Input() newValuePlaceholder = 'Add a value…';
  @Input() maxItemCount = 7;
  @Input() options: string[];
  @Input() alwaysDropShadow = false;
  @Input() onlyShadowBorder = false;
  @Input() editable = false;

  @Input() set default(value: string) {
    this.selected = value;
  }

  backgroundHeight: string;

  private _editMode = false;
  set editMode(value: boolean) {
    this._editMode = value;
    this.backgroundHeight = this.getBackgroundHeight();
  }

  get editMode(): boolean {
    return this._editMode;
  }

  @Output() value: EventEmitter<string> = new EventEmitter();
  @Output() optionChange: EventEmitter<{ from: string; to: string }> = new EventEmitter();

  @ViewChild('top') top: ElementRef;
  @ViewChild('bottom') bottom: ElementRef;

  selected: string;
  newOption: string;
  isOpen = false;

  constructor(private cancelService: CancelService, private changeDetection: ChangeDetectorRef) {
    this.cancelService.subscribe(this, () => {
      this.isOpen = false;
      this.editMode = false;
      this.changeDetection.markForCheck();
    });
  }

  changeOption(from: string, event) {
    console.log(event);
    this.optionChange.emit({
      from,
      to: event.target.value
    });
  }

  get otherOptions(): string[] {
    return this.options.filter(a => a !== this.selected);
  }

  handleKeys(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.addNewOption();
    }
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
    if (!this.isOpen) {
      this.editMode = false;
    }
    this.backgroundHeight = this.getBackgroundHeight();
  }

  onArrowClick(event) {
    if (this.editMode) {
      this.toggle();
      event.stopPropagation();
    }
  }

  private getBackgroundHeight(): string {
    if (this.isOpen && this.top && this.bottom) {
      const topHeight = this.top.nativeElement.clientHeight;
      const bottomHeight = this.bottom.nativeElement.clientHeight;
      console.log(topHeight, bottomHeight);
      return `${topHeight + bottomHeight}px`;
    }
    return `100%`;
  }
}
