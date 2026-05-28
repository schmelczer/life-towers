import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { ColoredBlock, Tower } from '../../../../model/tower';
import { ModalService } from '../../../../services/modal.service';
import { Observable } from 'rxjs/internal/Observable';
import { Range } from '../../../../interfaces/range';
import { top } from '../../../../utils/top';
import { CancelService } from '../../../../services/cancel.service';

type StyledBlock = ColoredBlock & { style: { [p: string]: string }; shouldDraw: boolean; cssClass: string };

@Component({
  selector: 'app-tower',
  templateUrl: './tower.component.html',
  styleUrls: ['./tower.component.scss']
})
export class TowerComponent implements OnInit {
  @Input() dateRange$: Observable<Range<Date>>;
  @Input() tower$: Observable<Tower>;

  private dateRange: Range<Date>;
  private tower: Tower;

  get towerName(): string {
    return this.tower ? this.tower.name : 'Loading…';
  }

  set towerName(value: string) {
    this.tower.changeName(value);
  }

  tasks: Array<ColoredBlock>;

  styledBlocks: Array<StyledBlock> = [];

  get drawableBlocks(): Array<StyledBlock> {
    return this.styledBlocks.filter(b => b.shouldDraw);
  }

  public constructor(private modalService: ModalService, private changeDetection: ChangeDetectorRef) {}

  ngOnInit() {
    this.tower$.subscribe(value => {
      // console.log(this.tower, value);
      if (value) {
        this.styledBlocks = value.coloredBlocks
          .filter(b => b.isDone)
          .map(b => {
            const classedBlock = b as StyledBlock;
            classedBlock.shouldDraw = true;
            classedBlock.style = { transform: 'translateY(0)', opacity: '1' };
            classedBlock.cssClass = '';
            return classedBlock;
          });

        if (this.tower && this.tower.latestVersion === value) {
          const difference = this.tower.blocks.map((b, index) => {
            return b === value.blocks[index];
          });

          if (
            (difference.every(i => i) &&
              this.tower.blocks.length + 1 === value.blocks.length &&
              top(value.blocks).isDone) ||
            (this.tower.blocks.length === value.blocks.length &&
              this.tower.blocks.filter(b => b.isDone).length + 1 === value.blocks.filter(b => b.isDone).length)
          ) {
            const lastBlock = top(this.styledBlocks);
            if (lastBlock) {
              lastBlock.style = { transform: 'translateY(500%)', opacity: '0' };
              setTimeout(() => {
                this.makeBlockDescend(lastBlock);
                this.changeDetection.markForCheck();
              }, 0);
            }
          }
        }

        this.tasks = value.coloredBlocks.filter(block => !block.isDone);
        this.tower = value;
        this.changeDetection.markForCheck();
      }
    });

    this.dateRange$.subscribe(dateRange => {
      this.initData(dateRange);
      this.dateRange = dateRange;
    });
  }

  makeBlockDescend(block: StyledBlock) {
    block.cssClass = 'descend';
    block.style = { transform: 'translateY(0)', opacity: '1' };
  }

  makeBlockAscend(block: StyledBlock) {
    block.cssClass = 'ascend';
    block.style = { transform: 'translateY(500%)', opacity: '0' };
  }

  initData(newDateRange: Range<Date>) {
    for (const block of this.styledBlocks) {
      block.shouldDraw = newDateRange.from <= block.created;

      if (newDateRange.to < block.created) {
        this.makeBlockAscend(block);
      }
      if (block.shouldDraw && block.created <= newDateRange.to) {
        this.makeBlockDescend(block);
      }
    }
  }

  public async addBlock() {
    try {
      await this.modalService.showBlocks({
        tower$: this.tower$,
        onlyDone: true
      });
    } catch {
      // pass
    }
  }
}
