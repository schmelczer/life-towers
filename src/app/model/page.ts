import { Base } from './base';
import { IPage } from '../interfaces/persistance/page';
import { Tower } from './tower';
import { ITower } from '../interfaces/persistance/tower';

export class Page extends Base implements IPage {
  constructor(props) {
    // TODO: remove
    if (!props.userData) {
      props.userData = {};
    }

    super(props);
    // @ts-ignore to prevent update message
    this.__towers = this.towers.map(t => this.createTower(t));
  }

  // Only here to prevent ts warnings.
  name: string;
  towers: Tower[];
  userData: {
    hideCreateTowerButton: boolean;
    defaultDateRange: {
      from: Date;
      to: Date;
    };
  };

  moveTower({ previousIndex, currentIndex }: { previousIndex: number; currentIndex: number }) {
    if (previousIndex === currentIndex) {
      return;
    }

    const tower = this.towers[previousIndex];
    this.towers.splice(previousIndex, 1);
    this.towers.splice(currentIndex, 0, tower);
    this.update();
  }

  addTower(name = '') {
    let hue;
    do {
      hue = Math.random() * 360;
    } while (30 <= hue && hue <= 200);

    this.towers.push(
      this.createTower({
        name,
        blocks: [],
        baseColor: { h: hue, s: 100, l: 50 }
      })
    );

    this.update();
  }

  private createTower(props: ITower): Tower {
    const tower = new Tower(props);
    tower.subscribe(() => this.update());
    return tower;
  }

  removeTower(tower: Tower) {
    this.towers = this.towers.filter(t => t !== tower);
  }
}
