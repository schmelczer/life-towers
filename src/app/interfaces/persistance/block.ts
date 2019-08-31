import { Typed } from './typed';

export interface IBlock extends Typed {
  type: 'Block';
  created: Date;
  tag: string;
  isDone: boolean;
  description: string;
}
