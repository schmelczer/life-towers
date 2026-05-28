import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { ModalService } from '../../../../../services/modal.service';
import { ColoredBlock, Tower } from '../../../../../model/tower';
import { Observable } from 'rxjs/internal/Observable';

@Component({
  selector: 'app-block',
  templateUrl: './block.component.html',
  styleUrls: ['./block.component.scss']
})
export class BlockComponent {
  @Input() block: ColoredBlock;
  @Input() tower$: Observable<Tower>;

  constructor(private modalService: ModalService) {}

  async handleClick() {
    try {
      await this.modalService.showBlocks({
        tower$: this.tower$,
        startBlock: this.block,
        onlyDone: true
      });
    } catch {
      // pass
    }
  }
}
