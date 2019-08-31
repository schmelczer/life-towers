import { Typed } from './typed';

export interface IColor extends Typed {
  type: 'Color';
  h: number;
  s: number;
  l: number;
}
