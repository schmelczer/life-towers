import { ITower } from './tower';

export interface IPage {
  name: string;
  towers: ITower[];

  userData: {
    hideCreateTowerButton: boolean;
    defaultDateRange: {
      from: Date;
      to: Date;
    };
  };
}
