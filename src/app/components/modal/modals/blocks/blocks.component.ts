import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ModalService } from '../../../../services/modal.service';
import { Tower } from '../../../../model/tower';
import { Observable } from 'rxjs/internal/Observable';
import { Block } from '../../../../model/block';
import { IBlock } from '../../../../interfaces/persistance/block';
import { CancelService } from '../../../../services/cancel.service';
import { range } from 'src/app/utils/range';
import { top } from 'src/app/utils/top';

@Component({
  selector: 'app-blocks',
  templateUrl: './blocks.component.html',
  styleUrls: ['./blocks.component.scss']
})
export class BlocksComponent implements OnInit, OnDestroy {
  readonly range = range;
  readonly top = top;

  tower: Tower;

  editedValues: Array<Partial<IBlock>>;

  endOfScrollToken = 0;
  editMode = false;
  activeChild: number;
  scrollMayEnd = true;

  onlyDone: boolean;

  @ViewChild('container') container: ElementRef;
  private subscription;

  @HostListener('click') cancel() {
    this.cancelService.cancelAll();
  }

  @HostListener('touchstart') fingerDown() {
    this.scrollMayEnd = false;
  }

  @HostListener('touchend') fingerUp() {
    this.scrollMayEnd = true;
    this.onScroll();
  }

  @HostListener('scroll') onScroll() {
    console.log('scrolling');

    this.animateScroll();
    const newToken = ++this.endOfScrollToken;
    setTimeout(() => {
      if (newToken === this.endOfScrollToken && this.scrollMayEnd) {
        this.adjustPosition();
      }
    }, 120);
  }

  constructor(
    public modalService: ModalService,
    private cancelService: CancelService,
    private changeDetector: ChangeDetectorRef,
    private component: ElementRef
  ) {
    window.addEventListener('resize', this.onScroll.bind(this));
  }

  get blocks(): Array<Block> {
    return this.tower.blocks.filter(b => b.isDone === this.onlyDone);
  }

  ngOnInit() {
    const {
      tower$,
      onlyDone,
      startBlock
    }: { tower$: Observable<Tower>; onlyDone: boolean; startBlock: Block } = this.modalService.active.input;

    this.onlyDone = onlyDone;
    this.subscription = tower$.subscribe(value => {
      this.tower = value;
      this.editedValues = this.blocks.map(({ isDone, description, tag }) => ({ isDone, description, tag }));
      this.editedValues.push({
        isDone: this.onlyDone,
        description: ''
      });

      setTimeout(() =>
        this.scrollToChild(startBlock ? this.blocks.indexOf(startBlock) + 1 : this.blocks.length + 1, true)
      );
    });
  }

  animateScroll() {
    if (!this.container || !this.component) {
      return;
    }

    const c = this.component.nativeElement;

    [...this.container.nativeElement.children]
      .slice(1, -1)
      .forEach(element =>
        this.animate(
          element.style,
          element.querySelector('.mask').style,
          Math.abs(element.offsetLeft - c.scrollLeft + element.clientWidth / 2 - window.innerWidth / 2) /
            element.clientWidth
        )
      );
  }

  animate(cardStyle, maskStyle, t: number) {
    t = Math.min(2, Math.max(0, t));
    cardStyle.opacity = (1.33 * (1 - t / 2)).toString();
    console.log(1 - t / 2);
    t = Math.min(1, Math.max(0, t));
    maskStyle.opacity = Math.pow(t, 0.5).toString();
    maskStyle.display = t <= 0.05 ? 'none' : 'block';
  }

  adjustPosition() {
    if (!this.container || !this.component) {
      return;
    }

    console.log('adjusting position');

    const c = this.component.nativeElement;

    const middle =
      [...this.container.nativeElement.children]
        .slice(1, -1)
        .map(element => Math.abs(element.offsetLeft - c.scrollLeft + element.clientWidth / 2 - window.innerWidth / 2))
        .map((value, index) =>
          Math.abs(index + 1 - this.activeChild) === 1 ? Math.abs(value - window.innerWidth / 4) : value
        )
        .reduce(
          (middleIndex, current, currentIndex, list) => (list[middleIndex] < current ? middleIndex : currentIndex),
          0
        ) + 1;

    this.scrollToChild(middle);
    this.changeDetector.markForCheck();
  }

  scrollToChild(index: number, instantly?: boolean) {
    this.activeChild = index;
    console.log('scrolling to', index);
    const element = this.container.nativeElement.children[index];
    this.component.nativeElement.scrollTo({
      left: element.offsetLeft - (window.innerWidth / 2 - element.clientWidth / 2),
      behavior: instantly ? 'auto' : 'smooth'
    });
  }

  submitAdd() {
    top(this.editedValues).created = new Date();
    this.tower.addBlock(top(this.editedValues) as IBlock);
    this.modalService.submit();
  }

  submitChange() {
    this.blocks[this.activeChild - 1].changeKeys(this.editedValues[this.activeChild - 1]);
    this.modalService.submit();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
