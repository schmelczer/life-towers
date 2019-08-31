import { IBlock } from './block';
import { IColor } from './color';
import { Typed } from './typed';

export interface ITower extends Typed {
  type: 'Tower';
  name: string;
  blocks: IBlock[];
  baseColor: IColor;
}
