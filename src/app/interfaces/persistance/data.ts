import { IPage } from './page';
import { IUnique } from './unique';

export interface IData extends IUnique {
  pages: Array<IPage>;
}
