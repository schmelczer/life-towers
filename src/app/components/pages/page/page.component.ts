import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Page } from '../../../model/page';
import { ModalService } from '../../../services/modal.service';
import { Observable } from 'rxjs/internal/Observable';
import { Range } from '../../../interfaces/range';
import { Subject } from 'rxjs/internal/Subject';
import { Tower } from '../../../model/tower';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

@Component({
  selector: 'app-page',
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss']
})
export class PageComponent implements OnInit {
  @Input() page$: Observable<Page>;
  private page: Page;

  towers: Array<BehaviorSubject<Tower>> = [];

  @Output() isDragHappening: EventEmitter<boolean> = new EventEmitter();

  readonly MIN_BLOCK_COUNT_BEFORE_SHOWING_SLIDER = 6;

  isDragging = false;
  draggedTowerIndex: number;
  nearTrashcan = false;

  dates: Date[] = [];
  dateRange: Subject<Range<Date>> = new Subject<Range<Date>>();

  get dateLabels(): string[] {
    return this.dates.map(d => d.toLocaleDateString());
  }

  constructor(private modalService: ModalService) {}

  ngOnInit(): void {
    this.page$.subscribe(value => {
      if (value) {
        this.towers = value.towers.map((t, index) => {
          if (index < this.towers.length) {
            if (this.towers[index].getValue() !== t) {
              this.towers[index].next(t);
            }
            return this.towers[index];
          }
          return new BehaviorSubject(t);
        });

        this.page = value;
        this.dates = value.towers
          .reduce((all, t) => [...t.blocks.map(b => b.created), ...all], [])
          .sort((d1, d2) => d1.getTime() - d2.getTime());
      }
    });
  }

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
}
