import { Serializable } from './serializable';
import { IBlock } from '../interfaces/persistance/block';
import { Node } from '../storage/node';

export class Block extends Serializable implements IBlock {
  constructor(parent: Node, props: IBlock) {
    super(parent, props);

    if (this.created.constructor.name !== 'Date') {
      this.created = new Date(this.created);
    }
  }

  // Only here to prevent ts warnings.
  type: 'Block';
  created: Date;
  isDone: boolean;
  description: string;
  tag: string;
}
