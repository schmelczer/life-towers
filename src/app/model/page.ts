import { Serializable } from './serializable';
import { IPage } from '../interfaces/persistance/page';
import { Tower } from './tower';
import { Node } from '../store/node';

export class Page extends Serializable implements IPage {
  constructor(parent: Node, props: IPage) {
    super(parent, props);
  }

  readonly name: string;
  get towers(): Array<Tower> {
    return this.children as Array<Tower>;
  }

  readonly userData: {
    hideCreateTowerButton: boolean;
    defaultDateRange: {
      from: Date;
      to: Date;
    };
  };

  setHideCreateTowerButton(value: boolean) {
    this.changeKey({
      propertyName: 'userData',
      value: {
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

    this.changeValue({
      oldValue: this.towers,
      newValue: towers
    });
  }

  addTower(name = '') {
    let hue;
    do {
      hue = Math.random() * 360;
    } while (30 <= hue && hue <= 200);

    new Tower(this, {
      name,
      blocks: [],
      baseColor: { h: hue, s: 100, l: 50 }
    });
  }

  removeTower(tower: Tower) {
    this.changeValue({
      oldValue: this.towers,
      newValue: this.towers.filter(t => t !== tower)
    });
  }
}
