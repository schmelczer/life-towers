import { IBlock } from './block';
import { IColor } from '../color';

export interface ITower {
  name: string;
  blocks: IBlock[];
  baseColor: IColor;
}
