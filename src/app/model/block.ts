import { Serializable } from './serializable';
import { IBlock } from '../interfaces/persistance/block';
import { Node } from '../store/node';
import { InnerNodeState } from '../store/inner-node';

export interface BlockState extends IBlock, InnerNodeState {}

export class Block extends Serializable implements IBlock, BlockState {
  readonly created: Date;
  readonly isDone: boolean;
  readonly description: string;
  readonly tag: string;

  constructor(props: IBlock) {
    console.log('b');
    if (props.created.constructor.name !== 'Date') {
      props.created = new Date(props.created);
    }
    super(props, 'Block');
  }
}
