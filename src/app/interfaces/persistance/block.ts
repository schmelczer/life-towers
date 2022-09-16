import { IUnique } from './unique';

export interface IBlock extends IUnique {
  created: Date;
  tag: string;
  isDone: boolean;
  description: string;
}
