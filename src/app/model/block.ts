import { Base } from './base';
import { IBlock } from '../interfaces/persistance/block';
import { Color } from './color';

export class Block extends Base implements IBlock {
  constructor(props: IBlock) {
    super(props);

    if (this.created.constructor.name !== 'Date') {
      // Prevent update message
      // @ts-ignore
      this.__created = new Date(this.created);
    }
  }

  color: Color;

  // Only here to prevent ts warnings.
  created: Date;
  isDone: boolean;
  description: string;
  tag: string;
}
