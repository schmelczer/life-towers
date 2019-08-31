import { Component, Input } from '@angular/core';
import { Tower } from '../../../../model/tower';
import { ModalService } from '../../../../services/modal.service';
import { Block } from '../../../../model/block';
import { IColor } from '../../../../interfaces/persistance/color';
import { toHslString } from '../../../../utils/color';

@Component({
  selector: 'app-tower',
  templateUrl: './tower.component.html',
  styleUrls: ['./tower.component.scss']
})
export class TowerComponent {
  readonly toHslString = toHslString;

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

  get drawableBlocks(): Array<Block & { color: IColor }> {
    return this.tower.coloredBlocks.filter(
      block => this.dateRange.from <= block.created && block.created <= this.dateRange.to && block.isDone
    );
  }

  get tasks(): Array<Block & { color: IColor }> {
    return this.tower.coloredBlocks.filter(
      block => this.dateRange.from <= block.created && block.created <= this.dateRange.to && !block.isDone
    );
  }

  @Input() tower: Tower;

  _dateRange: { from: Date; to: Date };

  isFalling = true;

  public async addBlock() {
    try {
      const { selected: tag, description, isDone } = await this.modalService.showCreateBlock({
        options: this.tower.tags,
        isTask: false
      });
      this.tower.addBlock({ tag, description, isDone });
    } catch (e) {
      // pass
    }
  }
}
