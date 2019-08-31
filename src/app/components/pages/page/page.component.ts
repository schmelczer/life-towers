import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Page } from '../../../model/page';
import { ModalService } from '../../../services/modal.service';
import { DataService } from '../../../services/data.service';

@Component({
  selector: 'app-page',
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss']
})
export class PageComponent {
  private _page: Page;
  @Input() set page(value: Page) {
    if (!value) {
      return;
    }

    this._page = value;
    this.updateDates();
  }

  @Output() isDragHappening: EventEmitter<boolean> = new EventEmitter();

  get page(): Page {
    return this._page;
  }

  readonly MIN_BLOCK_COUNT_BEFORE_SHOWING_SLIDER = 3;

  isDragging = false;
  draggedTowerIndex: number;
  nearTrashcan = false;

  dates: Date[] = [];
  startDate: Date;
  endDate: Date;

  get dateLabels(): string[] {
    return this.dates.map(d => d.toLocaleDateString());
  }

  get dateRange(): { from: Date; to: Date } {
    return this.dates.length >= this.MIN_BLOCK_COUNT_BEFORE_SHOWING_SLIDER
      ? {
          from: this.startDate,
          to: this.endDate
        }
      : {
          from: new Date(0, 0),
          to: new Date(10000, 0)
        };
  }

  constructor(private modalService: ModalService, public dataService: DataService) {}

  dropDrag(event: any) {
    this.page.moveTower(event);
    this.isDragging = false;
    this.isDragHappening.emit(false);
  }

  startDrag(id: number) {
    this.draggedTowerIndex = id;
    this.isDragging = true;
    this.isDragHappening.emit(true);
  }

  trashEnter() {
    this.nearTrashcan = true;
    window.document.querySelector('.cdk-drag-preview').className += ' trash-highlight';
  }

  trashExit() {
    this.nearTrashcan = false;
    const elem = window.document.querySelector('.cdk-drag-preview');
    elem.className = elem.className
      .split(' ')
      .slice(0, -1)
      .join(' ');
  }

  async removeTower() {
    try {
      const tower = this.page.towers[this.draggedTowerIndex];
      await this.modalService.showRemoveTower(tower);
      this.page.removeTower(tower);
    } catch {
      // pass
    }
  }

  private updateDates() {
    this.dates = this.page.towers
      .reduce((all, t) => [...t.blocks.map(b => b.created), ...all], [])
      .sort((d1, d2) => d1.getTime() - d2.getTime());
  }
}
