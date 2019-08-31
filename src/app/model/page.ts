import { Serializable } from './serializable';
import { IPage } from '../interfaces/persistance/page';
import { Tower } from './tower';
import { Node } from '../storage/node';

export class Page extends Serializable implements IPage {
  constructor(parent: Node, props: IPage) {
    super(parent, props);
  }

  // Only here to prevent ts warnings.
  name: string;
  get towers(): Array<Tower> {
    return this.children as Array<Tower>;
  }
  type: 'Page';

  userData: {
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

    this.map(page => {
      const tower = page.towers[previousIndex];
      page.towers.splice(previousIndex, 1);
      page.towers.splice(currentIndex, 0, tower);
    });
  }

  addTower(name = '') {
    let hue;
    do {
      hue = Math.random() * 360;
    } while (30 <= hue && hue <= 200);

    new Tower(this, {
      type: 'Tower',
      name,
      blocks: [],
      baseColor: { h: hue, s: 100, l: 50, type: 'Color' }
    });
  }

  removeTower(tower: Tower) {
    this.changeValue({
      oldValue: this.towers,
      newValue: this.towers.filter(t => t !== tower)
    });
  }
}
