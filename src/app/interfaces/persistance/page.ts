import { ITower } from './tower';
import { Typed } from './typed';

export interface IPage extends Typed {
  type: 'Page';
  name: string;
  towers: ITower[];

  userData: {
    hideCreateTowerButton?: boolean;
    defaultDateRange?: {
      from: Date;
      to: Date;
    };
  };
}
