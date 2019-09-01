import { Component, Input } from '@angular/core';
import { ColoredBlock, Tower } from '../../../../model/tower';
import { ModalService } from '../../../../services/modal.service';

@Component({
  selector: 'app-tower',
  templateUrl: './tower.component.html',
  styleUrls: ['./tower.component.scss']
})
export class TowerComponent {
  get towerName(): string {
    return this.tower.name;
  }

  set towerName(value: string) {
    this.tower.changeName(value);
  }

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

  get drawableBlocks(): Array<ColoredBlock> {
    return this.tower.coloredBlocks.filter(
      block => this.dateRange.from <= block.created && block.created <= this.dateRange.to && block.isDone
    );
  }

  get tasks(): Array<ColoredBlock> {
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
