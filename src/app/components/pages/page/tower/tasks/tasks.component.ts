import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { Block, BlockState } from '../../../../../model/block';
import { Tower } from '../../../../../model/tower';
import { ModalService } from '../../../../../services/modal.service';
import { CancelService } from '../../../../../services/cancel.service';
import { IColor } from '../../../../../interfaces/color';
import { IBlock } from '../../../../../interfaces/persistance/block';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit {
  @Input() tasks: Array<Block & { color: IColor }>;
  @Input() tower: Tower;

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

  constructor(private modalService: ModalService, private cancelService: CancelService) {
    this.cancelService.subscribe(this, () => {
      this.isOpen = false;
    });
  }

  ngOnInit() {}

  async handleClick(block: Block) {
    try {
      const { selected, description, isDone } = await this.modalService.showEditBlock({
        options: this.tower.tags,
        default: block.tag,
        description: block.description,
        isDone: block.isDone
      });

      const change: Partial<IBlock> = {
        tag: selected,
        description,
        isDone
      };
      if (!block.isDone && isDone) {
        change.created = new Date();
      }

      block.changeKeys(change);
    } catch {
      // pass
    }
  }

  public async addTask() {
    try {
      const { selected: tag, description, isDone } = await this.modalService.showCreateBlock({
        options: this.tower.tags,
        isTask: true
      });
      this.tower.addBlock({ tag, description, isDone });
    } catch (e) {
      // pass
    }
  }
}
