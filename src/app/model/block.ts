import { IBlock } from '../interfaces/persistance/block';
import { InnerNode, InnerNodeState } from '../store/inner-node';

export interface BlockState extends IBlock, InnerNodeState {}

export class Block extends InnerNode implements IBlock, BlockState {
  readonly tag: string;
  readonly description: string;
  readonly isDone: boolean;
  readonly created: Date;

  constructor(props: IBlock, referenceDeserializer: (from: any) => any = e => e) {
    super([], props.id);
    if (props.created.constructor.name !== 'Date') {
      props.created = new Date(props.created);
    }
    this.tag = props.tag;
    this.description = props.description;
    this.isDone = props.isDone;
    this.created = props.created;
  }

  changeKeys(props: Partial<BlockState>): this {
    return super.changeKeys<BlockState>(props);
  }

  serialize(referenceSerializer: (ref: object) => any): IBlock {
    return {
      ...super.serialize(referenceSerializer),
      tag: this.tag,
      description: this.description,
      isDone: this.isDone,
      created: this.created
    };
  }
}
