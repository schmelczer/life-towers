import { Serializable } from './serializable';
import { IPage } from '../interfaces/persistance/page';
import { Tower } from './tower';
import { InnerNodeState } from '../store/inner-node';

export interface PageState extends InnerNodeState, IPage {
  towers: Array<Tower>;
}

export class Page extends Serializable implements IPage, PageState {
  readonly name: string;

  readonly userData: {
    hideCreateTowerButton: boolean;
    defaultDateRange: {
      from: Date;
      to: Date;
    };
  };

  constructor(props: IPage) {
    super(props, 'Page', props.towers.map(t => new Tower(t)));
  }

  get towers(): Array<Tower> {
    return this.children as Array<Tower>;
  }

  changeProps(props: Partial<PageState>): this {
    if (props.hasOwnProperty('towers')) {
      props.children = props.towers;
      delete props.towers;
    }
    return this.changeKeys<PageState>(props);
  }

  setHideCreateTowerButton(value: boolean) {
    this.changeProps({
      userData: {
        ...this.userData,
        hideCreateTowerButton: value
      }
    });
  }

  moveTower({ previousIndex, currentIndex }: { previousIndex: number; currentIndex: number }) {
    if (previousIndex === currentIndex) {
      return;
    }

    const towers = [...this.towers];
    const tower = towers[previousIndex];
    towers.splice(previousIndex, 1);
    towers.splice(currentIndex, 0, tower);

    this.changeProps({
      towers
    });
  }

  changeName(to: string) {
    this.changeProps({
      name: to
    });
  }

  addTower(name = '') {
    let hue;
    do {
      hue = Math.random() * 360;
    } while (30 <= hue && hue <= 200);

    this.addChildren([
      new Tower({
        name,
        blocks: [],
        baseColor: { h: hue, s: 100, l: 50 }
      })
    ]);
  }

  removeTower(tower: Tower) {
    this.changeProps({
      towers: this.towers.filter(t => t !== tower)
    });
  }
}
