import { Component, Input } from '@angular/core';
import { Block } from '../../../../../model/block';
import { ModalService } from '../../../../../services/modal.service';
import { Tower } from '../../../../../model/tower';

@Component({
  selector: 'app-block',
  templateUrl: './block.component.html',
  styleUrls: ['./block.component.scss']
})
export class BlockComponent {
  @Input() block: Block;
  @Input() tower: Tower;

  constructor(private modalService: ModalService) {}

  async handleClick() {
    try {
      const { selected, description, isDone } = await this.modalService.showEditBlock({
        options: this.tower.tags,
        default: this.block.tag,
        description: this.block.description,
        isDone: this.block.isDone
      });
      this.block.tag = selected;
      this.block.description = description;
      this.block.isDone = isDone;
    } catch {
      // pass
    }
  }
}
