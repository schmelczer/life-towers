import { ChangeDetectorRef, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { Block } from '../../../../../model/block';
import { Tower } from '../../../../../model/tower';
import { ModalService } from '../../../../../services/modal.service';
import { CancelService } from '../../../../../services/cancel.service';
import { IColor } from '../../../../../interfaces/color';
import { Observable } from 'rxjs/internal/Observable';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent {
  @Input() tasks: Array<Block & { color: IColor }>;
  @Input() tower$: Observable<Tower>;

  private _isOpen = false;
  @Input() set isOpen(value: boolean) {
    if (value) {
      this.cancelService.cancelAllExcept(this);
    }
    this._isOpen = value;
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  @ViewChild('allTask') allTask: ElementRef;

  constructor(
    private modalService: ModalService,
    private cancelService: CancelService,
    private changeDetection: ChangeDetectorRef
  ) {
    this.cancelService.subscribe(this, () => {
      this.isOpen = false;
    });
  }

  async handleClick(block: Block) {
    try {
      await this.modalService.showBlocks({
        tower$: this.tower$,
        startBlock: block,
        onlyDone: false
      });
    } catch {
      // pass
    } finally {
      this.changeDetection.markForCheck();
    }
  }
}
