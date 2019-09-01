import { Serializable } from './serializable';
import { IBlock } from '../interfaces/persistance/block';
import { Node } from '../store/node';

export class Block extends Serializable implements IBlock {
  constructor(parent: Node, props: IBlock) {
    super(parent, props, 'Block');
    this.onAfterClone();
  }

  protected onAfterClone(): void {
    if (this.created.constructor.name !== 'Date') {
      this.created = new Date(this.created);
    }

    // TODO: remove.
    if (this.isDone === null || this.isDone === undefined) {
      this.isDone = false;
    }
  }

  changeProperties(values: Partial<IBlock>) {
    this.changeKeys(values);
  }

  created: Date;
  isDone: boolean;
  readonly description: string;
  readonly tag: string;
}
