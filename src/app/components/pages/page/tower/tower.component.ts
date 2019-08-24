import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { Tower } from '../../../../model/tower';
import { ModalService } from '../../../../services/modal.service';
import { Block } from '../../../../model/block';

@Component({
  selector: 'app-tower',
  templateUrl: './tower.component.html',
  styleUrls: ['./tower.component.scss']
})
export class TowerComponent {
  @Input() set dateRange(value: { from: Date; to: Date }) {
    if (this.dateRange !== undefined && this.dateRange.from === value.from && this.dateRange.to === value.to) {
      return;
    }
    this._dateRange = value;
  }

  get dateRange(): { from: Date; to: Date } {
    return this._dateRange;
  }

  public constructor(private modalService: ModalService) {}

  get drawableBlocks(): Block[] {
    return this.tower.blocks.filter(
      block => this.dateRange.from <= block.created && block.created <= this.dateRange.to && block.isDone
    );
  }

  get tasks(): Block[] {
    return this.tower.blocks.filter(block => !block.isDone);
  }

  @Input() tower: Tower;

  _dateRange: { from: Date; to: Date };

  isFalling = true;

  public async addBlock() {
    try {
      const { selected: tag, description, isDone } = await this.modalService.showCreateBlock(this.tower.tags);
      this.tower.addBlock({ tag, description, isDone });
    } catch (e) {
      // pass
    }
  }
}
