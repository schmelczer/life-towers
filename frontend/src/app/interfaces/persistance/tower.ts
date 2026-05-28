import { IBlock } from './block';
import { IColor } from '../color';
import { IUnique } from './unique';

export interface ITower extends IUnique {
  name: string;
  blocks: IBlock[];
  baseColor: IColor;
}
