import { ITower } from './tower';
import { Range } from '../range';

export interface IPage {
  name: string;
  towers: ITower[];

  userData: {
    hideCreateTowerButton?: boolean;
    defaultDateRange?: Range<Date>;
  };
}
