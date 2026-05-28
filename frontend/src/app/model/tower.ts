import { ITower } from '../interfaces/persistance/tower';
import { lighten } from '../utils/color';
import { Block } from './block';
import { hash } from '../utils/hash';
import { IColor } from '../interfaces/color';
import { InnerNode, InnerNodeState } from '../store/inner-node';

export type ColoredBlock = Block & { color: IColor };

export interface TowerState extends ITower, InnerNodeState {
  blocks: Array<Block>;
}

export class Tower extends InnerNode implements ITower, TowerState {
  readonly name: string;
  readonly baseColor: IColor;
  tags: string[];
  coloredBlocks: Array<ColoredBlock>;

  constructor(props: ITower, referenceDeserializer: (from: any) => any = e => e) {
    super(props.blocks.map(b => new Block(referenceDeserializer(b), referenceDeserializer)), props.id);
    this.name = props.name;
    this.baseColor = props.baseColor;
    this.onAfterClone();
  }

  get blocks(): Array<Block> {
    return this.children as Array<Block>;
  }

  changeKeys(props: Partial<TowerState>): this {
    if (props.hasOwnProperty('blocks')) {
      props.children = props.blocks;
      delete props.blocks;
    }
    return super.changeKeys<TowerState>(props);
  }

  addBlock(props: { tag: string; description: string; isDone: boolean }) {
    this.addChildren([
      new Block({
        created: new Date(),
        ...props
      })
    ]);
  }

  changeName(name: string) {
    this.changeKeys({ name });
  }

  getColorOfTag(tag: string): IColor {
    return lighten((hash(tag) - 0.5) * 50, this.baseColor);
  }

  serialize(referenceSerializer: (ref: object) => any): ITower {
    return {
      ...super.serialize(referenceSerializer),
      name: this.name,
      baseColor: this.baseColor,
      blocks: this.blocks.map(referenceSerializer)
    };
  }

  protected onAfterClone() {
    this.blocks.sort((a, b) => {
      return a.created.getTime() - b.created.getTime();
    });

    this.coloredBlocks = this.blocks.map(b => {
      const coloredBlock = b as ColoredBlock;
      coloredBlock.color = this.getColorOfTag(b.tag);
      return coloredBlock;
    });

    this.tags = [];
    for (const block of this.blocks) {
      if (!this.tags.includes(block.tag)) {
        this.tags.push(block.tag);
      }
    }
  }
}
