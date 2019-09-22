import { ITower } from './tower';
import { Range } from '../range';
import { IUnique } from './unique';

export interface IPage extends IUnique {
  name: string;
  towers: ITower[];

  userData: {
    hideCreateTowerButton: boolean;
    defaultDateRange: Range<Date>;
  };
}
