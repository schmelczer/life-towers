import { Component, Input, OnInit } from '@angular/core';
import { ColoredBlock, Tower } from '../../../../model/tower';
import { ModalService } from '../../../../services/modal.service';
import { Observable } from 'rxjs/internal/Observable';
import { Range } from '../../../../interfaces/range';
import { top } from '../../../../utils/top';

type StyledBlock = ColoredBlock & { style: { [p: string]: string }; shouldDraw: boolean; cssClass: string };

@Component({
  selector: 'app-tower',
  templateUrl: './tower.component.html',
  styleUrls: ['./tower.component.scss']
})
export class TowerComponent implements OnInit {
  @Input() dateRange$: Observable<Range<Date>>;
  private dateRange: Range<Date>;

  @Input() tower$: Observable<Tower>;
  private tower: Tower;

  get towerName(): string {
    return this.tower ? this.tower.name : 'Loading…';
  }

  set towerName(value: string) {
    this.tower.changeName(value);
  }

  tasks: Array<ColoredBlock>;
  blocks: Array<StyledBlock> = [];
  get drawableBlocks(): Array<StyledBlock> {
    return this.blocks.filter(b => b.shouldDraw);
  }

  public constructor(private modalService: ModalService) {}

  ngOnInit() {
    this.tower$.subscribe(value => {
      if (value) {
        this.blocks = value.coloredBlocks
          .filter(b => b.isDone)
          .map(b => {
            let classedBlock = b as StyledBlock;
            classedBlock.shouldDraw = true;
            classedBlock.style = { transform: 'translateY(0)', opacity: '1' };
            classedBlock.cssClass = '';
            return classedBlock;
          });

        if (this.tower) {
          console.log(this.tower, this.tower.latestVersion, value);
        }
        if (this.tower && this.tower.latestVersion === value) {
          let difference = this.tower.blocks.map((b, index) => {
            return b === value.blocks[index];
          });

          console.log(this.tower.blocks);
          if (
            (difference.every(i => i) && this.tower.blocks.length + 1 === value.blocks.length) ||
            (this.tower.blocks.length === value.blocks.length &&
              this.tower.blocks.filter(b => b.isDone).length + 1 === value.blocks.filter(b => b.isDone).length)
          ) {
            const lastBlock = top(this.blocks);
            if (lastBlock) {
              lastBlock.style = { opacity: '0' };
              lastBlock.cssClass = 'descend';
              setTimeout(() => (lastBlock.style = { transform: 'translateY(0)', opacity: '1' }), 0);
            }
          }
        }

        this.tasks = value.coloredBlocks.filter(block => !block.isDone);

        this.tower = value;
      }
    });

    this.dateRange$.subscribe(dateRange => {
      this.initData(dateRange);
      this.dateRange = dateRange;
    });
  }

  initData(newDateRange: Range<Date>) {
    for (const block of this.blocks) {
      block.shouldDraw = newDateRange.from <= block.created;

      if ((block.cssClass === '' || block.cssClass === 'descend') && newDateRange.to < block.created) {
        block.cssClass = 'ascend';
        block.style = { transform: 'translateY(500%)', opacity: '0' };
      }
      if (block.shouldDraw && block.cssClass === 'ascend' && block.created < newDateRange.to) {
        block.cssClass = 'descend';
        block.style = { transform: 'translateY(0)', opacity: '1' };
      }
    }
  }

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
