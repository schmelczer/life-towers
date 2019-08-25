import { Component, EventEmitter, Input, Output } from '@angular/core';
import { range } from '../../../utils/range';

@Component({
  selector: 'app-double-slider',
  templateUrl: './double-slider.component.html',
  styleUrls: ['./double-slider.component.scss']
})
export class DoubleSliderComponent {
  @Input() labels: string[];

  @Input() set values(values: any[]) {
    if (values.length === 0) {
      return;
    }

    this._values = values;
    this.calculateLabels();
    if (this._oneValue > this._otherValue) {
      this._oneValue = this.MAX - 1;
    } else {
      this._otherValue = this.MAX - 1;
    }

    this.emitValue();
  }

  get values(): any[] {
    return this._values;
  }

  get oneValue(): number {
    return this._oneValue;
  }

  set oneValue(value: number) {
    this._oneValue = value;
    this.emitValue();
  }

  get otherValue(): number {
    return this._otherValue;
  }

  set otherValue(value: number) {
    this._otherValue = value;
    this.emitValue();
  }

  private _values: any[];

  @Output() lowerBound: EventEmitter<any> = new EventEmitter();
  @Output() upperBound: EventEmitter<any> = new EventEmitter();

  drawnLabels: string[];

  readonly MAX = 100;

  private _oneValue = 0;

  private _otherValue: number = this.MAX - 1;

  drawnLabelsIndices: Iterable<number>;

  private calculateLabels() {
    const labelCount = 6;
    const jumpLength = Math.round(this.labels.length / labelCount);
    this.drawnLabels = this.labels.filter((_, index) => index % jumpLength === 0);
    this.drawnLabelsIndices = range({ max: this.drawnLabels.length });
  }

  private indexFromValue(value: number): number {
    return Math.floor((value / this.MAX) * this.values.length);
  }

  getOffset(index: number): string {
    const labelIndex = index / this.drawnLabels.length;
    const slider1Index = this.oneValue / this.MAX - 0.1;
    const slider2Index = this.otherValue / this.MAX - 0.1;

    const dist = (a, b) => Math.abs(a - b);

    const labelSliderDistance = Math.min(dist(labelIndex, slider1Index), dist(labelIndex, slider2Index));

    const ACTIVE_ZONE = 0.2;
    const BASE_TRANSFORM = 'translateX(-50%) rotate(-45deg) translateY(100%)';

    if (labelSliderDistance > ACTIVE_ZONE) {
      return BASE_TRANSFORM;
    }

    return `translateY(${Math.pow((ACTIVE_ZONE - labelSliderDistance) / ACTIVE_ZONE, 1) * 30}px) ${BASE_TRANSFORM}`;
  }

  private emitValue() {
    if (this.oneValue < this.otherValue) {
      this.lowerBound.emit(this.values[this.indexFromValue(this.oneValue)]);
      this.upperBound.emit(this.values[this.indexFromValue(this.otherValue)]);
    } else {
      this.lowerBound.emit(this.values[this.indexFromValue(this.otherValue)]);
      this.upperBound.emit(this.values[this.indexFromValue(this.oneValue)]);
    }
  }
}
