import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ModalService } from '../../../../services/modal.service';
import { Tower } from '../../../../model/tower';
import { Observable } from 'rxjs/internal/Observable';
import { Block } from '../../../../model/block';
import { IBlock } from '../../../../interfaces/persistance/block';
import { CancelService } from '../../../../services/cancel.service';
import { range } from 'src/app/utils/range';
import { el } from '@angular/platform-browser/testing/src/browser_util';

const SWIPE_LIMIT = 0.35;

@Component({
  selector: 'app-blocks',
  templateUrl: './blocks.component.html',
  styleUrls: ['./blocks.component.scss']
})
export class BlocksComponent implements OnInit, OnDestroy {
  readonly range = range;

  tower: Tower;

  editedValues: Partial<IBlock>;

  endOfScrollToken = 0;
  editMode = false;
  activeChild: number;
  scrollMayEnd = true;

  @ViewChild('container') container: ElementRef;

  private subscription;
  private onlyDone: boolean;

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
    this.animateScroll();
    const newToken = ++this.endOfScrollToken;
    setTimeout(() => {
      if (newToken === this.endOfScrollToken && this.scrollMayEnd) {
        this.adjustPosition();
      }
    }, 120);
  }

  constructor(
    private modalService: ModalService,
    private cancelService: CancelService,
    private changeDetector: ChangeDetectorRef,
    private component: ElementRef
  ) {}

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
      setTimeout(() => this.scrollToChild(this.blocks.indexOf(startBlock) + 1, true));
    });

    this.editedValues = {
      isDone: onlyDone,
      description: ''
    };
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
    t = Math.min(1, Math.max(0, t));
    maskStyle.opacity = Math.pow(t, 0.5).toString();
    maskStyle.display = t === 0 ? 'none' : 'block';
  }

  adjustPosition() {
    if (!this.container || !this.component) {
      return;
    }

    const c = this.component.nativeElement;

    const middle =
      [...this.container.nativeElement.children]
        .slice(1, -1)
        .map(element => Math.abs(element.offsetLeft - c.scrollLeft + element.clientWidth / 2 - window.innerWidth / 2))
        .map((value, index) => (Math.abs(index + 1 - this.activeChild) === 1 ? value / 1.5 : value))
        .reduce(
          (middleIndex, current, currentIndex, list) => (list[middleIndex] < current ? middleIndex : currentIndex),
          0
        ) + 1;

    this.scrollToChild(middle);
    this.changeDetector.markForCheck();
  }

  scrollToChild(index: number, instantly?: boolean) {
    this.activeChild = index;
    const element = this.container.nativeElement.children[index];
    this.component.nativeElement.scrollTo({
      left: element.offsetLeft - (window.innerWidth / 2 - element.clientWidth / 2),
      behavior: instantly ? 'auto' : 'smooth'
    });
  }

  submitAdd() {
    this.editedValues.created = new Date();
    this.tower.addBlock(this.editedValues as IBlock);
    this.modalService.submit();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
